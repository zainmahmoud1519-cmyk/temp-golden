import { EmailMessage, UserSession, Domain } from "../types";

const API_BASE = "https://api.mail.tm";
const PROXY_BASE = "https://corsproxy.io/?";

// Helper to generate a random string
const randomString = (length: number = 8) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Smart Fetch Wrapper
 */
const smartFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    try {
        const res = await fetch(url, options);
        if (res.status === 403 || res.status === 429) {
            throw new Error("Blocked");
        }
        return res;
    } catch (error) {
        const targetUrl = encodeURIComponent(url);
        // Force new request through proxy cache
        const cacheBuster = `&_cb=${Date.now()}`; 
        const proxyUrl = `${PROXY_BASE}${targetUrl}${cacheBuster}`;
        return await fetch(proxyUrl, options);
    }
};

/**
 * Get available domains from the API
 * Filters strictly for active domains.
 */
export const getAvailableDomains = async (): Promise<Domain[]> => {
  try {
    // Strategy 1: Fetch with high itemsPerPage
    const res = await smartFetch(`${API_BASE}/domains?page=1&itemsPerPage=100&_t=${Date.now()}`);
    
    if (res.ok) {
        const data = await res.json();
        let domains = (data['hydra:member'] || []) as Domain[];
        
        // STRICT FILTER: Only allow active domains
        domains = domains.filter(d => d.isActive);
        
        if (domains.length > 0) return domains;
    }

    // Strategy 2: If first failed or empty, try default endpoint
    const res2 = await smartFetch(`${API_BASE}/domains?_t=${Date.now()}`);
    if (res2.ok) {
        const data = await res2.json();
        let domains = (data['hydra:member'] || []) as Domain[];
        
        // STRICT FILTER
        domains = domains.filter(d => d.isActive);
        
        return domains;
    }
    
    return [];
  } catch (error) {
    console.error("Critical: Could not fetch domains.", error);
    return []; 
  }
};

/**
 * Creates a real temporary email account using Mail.tm API
 */
export const createRealAccount = async (customUsername?: string, customDomain?: string): Promise<UserSession> => {
  try {
    let domain = customDomain;

    // 1. Get Domain if not provided
    if (!domain) {
      // Try to fetch domains up to 3 times if empty list returned initially
      let domains: Domain[] = [];
      for(let k=0; k<3; k++) {
         domains = await getAvailableDomains();
         if(domains.length > 0) break;
         await new Promise(r => setTimeout(r, 500)); // wait 500ms before retry
      }
      
      if (domains.length === 0) {
         throw new Error("لا يوجد نطاقات متاحة حالياً من الخادم. يرجى المحاولة لاحقاً."); 
      }
      
      // Select a random domain from the available list
      const randomIndex = Math.floor(Math.random() * domains.length);
      domain = domains[randomIndex].domain;
    }

    const isCustom = !!customUsername;
    let address = '';
    let password = '';
    let accountCreated = false;

    // Retry loop
    const maxRetries = isCustom ? 1 : 5; 

    for (let i = 0; i < maxRetries; i++) {
        const currentUsername = isCustom ? customUsername! : randomString(10);
        password = randomString(12);
        address = `${currentUsername}@${domain}`;

        const createRes = await smartFetch(`${API_BASE}/accounts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, password }),
        });

        if (createRes.ok) {
            accountCreated = true;
            break;
        } else {
            const status = createRes.status;
            
            if (status === 422) {
                if (isCustom) {
                    throw new Error("اسم المستخدم هذا غير متاح (محجوز مسبقاً). يرجى اختيار اسم آخر.");
                }
                console.warn(`Random username collision (${currentUsername}), retrying...`);
                continue;
            }
            const errText = await createRes.text();
            throw new Error(`فشل إنشاء الحساب: ${status}`);
        }
    }

    if (!accountCreated) {
        throw new Error("تعذر إنشاء حساب جديد بعد عدة محاولات.");
    }

    // 3. Get Token (Login)
    const tokenRes = await smartFetch(`${API_BASE}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, password }),
    });
    
    if (!tokenRes.ok) throw new Error("فشل تسجيل الدخول (Token Failed)");
    
    const tokenData = await tokenRes.json();
    const token = tokenData.token;

    // 4. Get Account Info
    const meRes = await smartFetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meData = await meRes.json();

    const now = new Date();
    const expiresAt = isCustom ? null : new Date(now.getTime() + 10 * 60 * 1000);

    return {
      emailAddress: address,
      createdAt: now,
      expiresAt: expiresAt,
      isPremium: isCustom,
      token: token,
      accountId: meData.id,
      password: password,
      isMock: false
    };

  } catch (error: any) {
    console.error("Account Creation Logic Error:", error);
    throw error;
  }
};

/**
 * Fetches the list of messages
 */
export const fetchMessages = async (token: string): Promise<EmailMessage[]> => {
  try {
    const res = await smartFetch(`${API_BASE}/messages?page=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!res.ok) return []; 
    
    const data = await res.json();
    return data['hydra:member'].map((msg: any) => ({
      id: msg.id,
      sender: msg.from.name || msg.from.address.split('@')[0],
      senderAddress: msg.from.address,
      subject: msg.subject,
      preview: msg.intro || "No preview available",
      body: msg.intro || "", 
      receivedAt: new Date(msg.createdAt),
      isRead: msg.seen,
      type: 'normal',
      hasFullDetails: false
    }));
  } catch (error) {
    return [];
  }
};

/**
 * Fetches message details
 */
export const fetchMessageDetails = async (token: string, messageId: string): Promise<Partial<EmailMessage> | null> => {
  try {
    const res = await smartFetch(`${API_BASE}/messages/${messageId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    
    let bodyContent = "No content";
    if (Array.isArray(data.html) && data.html.length > 0) {
        bodyContent = data.html.join('');
    } else if (typeof data.html === 'string' && data.html.length > 0) {
        bodyContent = data.html;
    } else if (data.text) {
        bodyContent = data.text;
    }

    return {
      body: bodyContent,
      hasFullDetails: true
    };
  } catch (error) {
    return null;
  }
};

export const deleteMessage = async (token: string, messageId: string): Promise<boolean> => {
  try {
    await smartFetch(`${API_BASE}/messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
    return true;
  } catch (error) {
    return false;
  }
}