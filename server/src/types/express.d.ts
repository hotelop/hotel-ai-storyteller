export interface AuthContext {
  userId: string;
  accountId: string;
  propertyId: string;
  role: "superadmin" | "brand" | "admin" | "creator";
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};
