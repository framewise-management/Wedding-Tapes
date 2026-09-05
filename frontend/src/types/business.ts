export interface Business {
  id: string;
  name: string;
  logo: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  instagram: string | null;
  appleId: string | null;
  appleConnected: boolean;
  appleCredentialSaved: boolean;
  googleCalendarId: string | null;
  defaultValidityDays: number | null;
  defaultTerms: string | null;
}
