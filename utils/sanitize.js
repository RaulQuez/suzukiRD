// strips CR/LF and caps length — for any value going into an email header (subject, to, etc.)
export const cleanHeader = (s) => String(s).replace(/[\r\n]/g, "").slice(0, 200);

// basic email format check — rejects malformed or newline-bearing addresses before we use them as a recipient
export const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s));
