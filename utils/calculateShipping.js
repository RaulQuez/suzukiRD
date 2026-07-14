/*
    Shared shipping calculation — the single source of truth for what an
    order's shipping costs. Called by BOTH the /shipping/calculate route
    (to show the customer a quote) and POST /orders (to set the real charged
    amount server-side). The client never gets to report shipping back to us.
*/
import Product from "../models/Product.js";
import axios from "axios";

/*
    authenticates with UPS OAuth and returns access token, 
    UPS uses OAuth 2.0 - we exchange our CLIENT_ID & CLIENT_SECRET for a temporary access token that expires in 4
    4 hours (14400 seconds). We request a fresh token on each shipping calculation.
*/
const getUPSToken = async () => {
    // UPS OAuth endpoint - we send our credentials as Basic auth with grant_type=client_credentials in the body. - standard OAuth 2.0 cleint credntials flow
    const credentials = Buffer.from(
        `${process.env.UPS_CLIENT_ID}:${process.env.UPS_CLIENT_SECRET}`
    ).toString("base64");   // base64 - encoding for compatibility, not security. That's why you always send it over HTTPS (which actually encrypts the connection) and never expose your credentials on the frontend.

    const response = await axios.post(
        "https://onlinetools.ups.com/security/v1/oauth/token",
        "grant_type=client_credentials",
        {
            headers: {
                "Authorization": `Basic ${credentials}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
        }
    );
    return response.data.access_token // UPS responds with this json object containing token
};

// returns true if the destination country is not in the US, used to decide which UPS serveiice to use 
const isInternational = (countryCode) => countryCode.toUpperCase() !== "US";

/*
    constructs the UPS Rating API request body. Expects a specific JSON structure withL
    - shipper info (warehouse address)
    - ship to info (customer address)
    - package details (weight + dimensions)
    - service code (03 = ground, 08 - worldwide expedited)

    @params products - array of { product, quantity } objects
    @params destination - { city, state, zip, country }
    @params totalWeight  - combined weight of all items
    @params totalVolume - combine volume of all items
*/
const buildShipmentPayload = (destination, totalWeight, totalVolume, serviceCode) => {
    // dimensional weight - UPS charges whichever is greater, actual weight or dimensional weight (volume / 139). send both and UPS figures out the billable weight.
    const dimWeight = (totalVolume / 139).toFixed(1);
    // Math.ciel - rounds a number up to nearest whole number, Math.max - returns the largest number, parseFloat() - converts a string to a decimal number
    const billableWeight = Math.ceil(Math.max(totalWeight, parseFloat(dimWeight)));

    return { 
        RateRequest: {
            Request: { 
                RequestOption: "Rate",
                TransactionReference: {
                    CustomerContext: "SuzukiRD Shipping Calculation"
                },
            },
            Shipment: {
                // shipper - warehouse in HIALEAH details, shipperNumber - UPS ACCOUNT NUMBER IN ENV
                Shipper: {
                    Name: process.env.UPS_SHIPPER_NAME,
                    ShipperNumber: process.env.UPS_ACCOUNT_NUMBER,
                    Address: {
                        AddressLine: [process.env.UPS_SHIPPER_ADDRESS],
                        City: process.env.UPS_SHIPPER_CITY,
                        StateProvinceCode: process.env.UPS_SHIPPER_STATE,
                        PostalCode: process.env.UPS_SHIPPER_ZIP,
                        CountryCode: process.env.UPS_SHIPPER_COUNTRY,
                    },
                },
                // shipTo - customer's delivery address, for international the stateProvinceCode may be empty depending on country - UPS handles it
                ShipTo: {
                    Name: "Customer",
                    Address: {
                        City: destination.city,
                        StateProvinceCode: destination.state || "",
                        PostalCode: destination.zip,
                        CountryCode: destination.country.toUpperCase(),
                        // this tells UPS this is a home delivery, which affects the rate. We assume residential since most customers ship to their home 
                        ResidentialAddressIndicator: "",
                    },
                },
                // Service is the UPS service code, 03 - UPS Ground (domestic US only), 08 - worldwide expedited (international)
                Service: {
                    Code: serviceCode,
                    Description: serviceCode === "03" ? "UPS Ground" : "UPS Worldwide Expedited",
                },
                // package - we treat all cart items as ONE box. UPS Required weight in lbs and deminsions in inches, we send the combined/total weight and volume
                Package: {
                    PackagingType: {
                        Code: "02", // customer supplied package
                        Description: "Package",
                    },
                    Dimensions: {
                        UnitOfMeasurement: {
                            Code: "IN",
                            Description: "Inches",
                        },
                        // approximate box dimenstions from total volume. we use cube root to estimate a roughlt cubic box
                        // Real boxes arent cubic but this gives UPS a reasonable dimensional weight calculation
                        Length: String(Math.ceil(Math.cbrt(totalVolume))),
                        Width: String(Math.ceil(Math.cbrt(totalVolume))),
                        Height: String(Math.ceil(Math.cbrt(totalVolume))),
                    },
                    PackageWeight: {
                        UnitOfMeasurement: {
                            Code: "LBS",
                            Description: "Pounds",
                        },
                        Weight: String(billableWeight),
                    },
                },
            },
        },
    };
};

/*
    Custom error so callers can tell a "bad input / contact us" situation
    (400-worthy) apart from a real server failure (500-worthy). Without this,
    a missing-weight problem and a UPS outage would be indistinguishable to
    whoever calls this function.
*/
export class ShippingError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

export async function calculateShipping(items, destination) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new ShippingError("Items are required");
    }
    if (!destination || !destination.country) {
        throw new ShippingError("Destination address is required");
    }

    const productIds = items.map(item => item.productId);
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    let totalWeight = 0;
    let totalVolume = 0;
    let missingData = [];

    // first pass — missing data check
    for (const item of items) {
        const product = productMap.get(item.productId.toString());
        if (!product) {
            throw new ShippingError(`Product not found: ${item.productId}`, 404);
        }
        const hasWeight = product.weight && product.weight > 0;
        const hasDimensions = product.dimensions &&
            product.dimensions.length > 0 &&
            product.dimensions.width > 0 &&
            product.dimensions.height > 0;

        if (!hasWeight || !hasDimensions) {
            missingData.push(product.name);
            console.warn(`SHIPPING WARNING: ${product.name} (${product._id}) is missing weight or dimensions. UPDATE IN ADMIN APP`);
        }
    }

    if (missingData.length > 0) {
        throw new ShippingError("Shipping cannot be calculated for this order. Please contact us for a shipping quote");
    }

    // second pass — combined weight and volume
    for (const item of items) {
        const product = productMap.get(item.productId.toString());  // ← note: .toString() added, see below
        const qty = item.quantity;
        totalWeight += product.weight * qty;
        const unitVolume = product.dimensions.length * product.dimensions.width * product.dimensions.height;
        totalVolume += unitVolume * qty;
    }

    const international = isInternational(destination.country);
    const serviceCode = international ? "08" : "03";
    const serviceName = international ? "UPS Worldwide Expedited" : "UPS Ground";

    const token = await getUPSToken();
    const payload = buildShipmentPayload(destination, totalWeight, totalVolume, serviceCode);

    let rateResponse;

    try {
        rateResponse = await axios.post(
            "https://onlinetools.ups.com/api/rating/v2409/Rate", payload,
            {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "transId": `suzukird-${Date.now()}`,
                    "transationSrc": "SuzukiRD",
                },
            }
        );
    } catch (err) {
        const upsErrors = err.response?.data?.response?.errors || [];
        if (upsErrors.some(e => e.code === "111035")) {
            throw new ShippingError(
                "This order exceeds standard weight limits. Please contact us for a freight shipping quote."
            );
        }
        throw err;
    }

    const ratedShipment = rateResponse.data.RateResponse.RatedShipment[0];
    const shippingCost = parseFloat(ratedShipment.TotalCharges.MonetaryValue);
    const currency = ratedShipment.TotalCharges.CurrencyCode;

    return {
        cost: parseFloat(shippingCost.toFixed(2)),
        service: serviceName,
        currency,
        international,
        breakdown: {
            actualWeight: parseFloat(totalWeight.toFixed(2)),
            dimensionalWeight: parseFloat((totalVolume / 139).toFixed(2)),
            billableWeight: Math.ceil(Math.max(totalWeight, totalVolume / 139)),
        },
    };
}