import { createContext, useContext, useState, useRef, ReactNode, useCallback } from "react";

interface AdminContextType {
  isAdmin: boolean;
  adminLogin: (username: string, passcode: string) => Promise<boolean>;
  adminLogout: () => void;
  adminRequest: (action: string, params?: Record<string, any>) => Promise<any>;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  adminLogin: async () => false,
  adminLogout: () => {},
  adminRequest: async () => null,
});

export const useAdmin = () => useContext(AdminContext);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const credRef = useRef({ username: "", passcode: "" });

  const adminLogin = useCallback(async (username: string, passcode: string) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-api`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ action: "login", username, passcode }),
      });
      if (res.ok) {
        credRef.current = { username, passcode };
        setIsAdmin(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const adminLogout = useCallback(() => {
    credRef.current = { username: "", passcode: "" };
    setIsAdmin(false);
  }, []);

  const adminRequest = useCallback(async (action: string, params: Record<string, any> = {}) => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ action, ...credRef.current, ...params }),
    });
    if (!res.ok) throw new Error("Admin request failed");
    return res.json();
  }, []);

  return (
    <AdminContext.Provider value={{ isAdmin, adminLogin, adminLogout, adminRequest }}>
      {children}
    </AdminContext.Provider>
  );
};
