import fs from 'fs';

// 1. Fix LoginPage.tsx
let loginPath = 'src/pages/auth/LoginPage.tsx';
let loginContent = fs.readFileSync(loginPath, 'utf8');

// Replace DEMO_CREDENTIALS / MOCK_CREDENTIALS
loginContent = loginContent.replace(
/const MOCK_CREDENTIALS = \{\s*email: 'admin@sentinel\.com',\s*password: '123456',\s*\};/g,
`import { supabase } from '@/shared/api/supabase';\n\nconst MOCK_CREDENTIALS = {
  email: 'hasan.aksoy@sentinelbank.com.tr',
  password: '123456',
};`
);

// Remove MOCK_USER
loginContent = loginContent.replace(/const MOCK_USER = \{[\s\S]*?\};\n/m, '');

// Replace Login function
const oldLoginBlock = `  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    setTimeout(() => {
      if (email === MOCK_CREDENTIALS.email && password === MOCK_CREDENTIALS.password) {
        localStorage.setItem('sentinel_token', 'mock-token-123');
        localStorage.setItem('sentinel_user', JSON.stringify(MOCK_USER));
        localStorage.setItem('isAuthenticated', 'true');

        setSuccess(true);

        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
      } else {
        setError('E-posta veya şifre hatalı');
        setLoading(false);
      }
    }, 800);
  };`;

const newLoginBlock = `  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { data, error: dbError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (dbError || !data) {
        setError('E-posta sistemde bulunamadı (Supabase)');
        setLoading(false);
      } else {
        localStorage.setItem('sentinel_token', data.id);
        localStorage.setItem('sentinel_user', JSON.stringify({
          id: data.id,
          name: data.full_name,
          email: data.email,
          role: data.role,
          title: data.title
        }));
        localStorage.setItem('isAuthenticated', 'true');
        setSuccess(true);
        setTimeout(() => navigate('/dashboard'), 500);
      }
    } catch(err) {
      setError('Giriş yapılırken sistem hatası oluştu');
      setLoading(false);
    }
  };`;

loginContent = loginContent.replace(oldLoginBlock, newLoginBlock);

fs.writeFileSync(loginPath, loginContent);
console.log('LoginPage MOCK_USER replaced with Supabase hook.');

// 2. Fix AuditeeDashboardPage.tsx
let dashboardPath = 'src/pages/auditee-portal/AuditeeDashboardPage.tsx';
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

dashboardContent = dashboardContent.replace(
  "const MOCK_AUDITEE_ID = '00000000-0000-0000-0000-000000000001';",
  `const userStr = localStorage.getItem('sentinel_user');
  let currentUserId = '00000000-0000-0000-0000-000000000010'; // Fallback to Burak Yılmaz (Auditee)
  try {
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u.id) currentUserId = u.id;
    }
  } catch(e) {}`
);

dashboardContent = dashboardContent.replace(
  "auditeeId={MOCK_AUDITEE_ID}",
  "auditeeId={currentUserId}"
);

fs.writeFileSync(dashboardPath, dashboardContent);
console.log('AuditeeDashboardPage modified to use localStorage session ID.');

// 3. Risk store
let riskStorePath = 'src/entities/risk/store.ts';
let riskStoreContent = fs.readFileSync(riskStorePath, 'utf8');
riskStoreContent = riskStoreContent.replace("const MOCK_TENANT_ID = ACTIVE_TENANT_ID;", "const getUserId = () => { try { const u = localStorage.getItem('sentinel_user'); return u ? JSON.parse(u).id : '11111111-1111-1111-1111-000000000002'; } catch { return '11111111-1111-1111-1111-000000000002'; } };");
riskStoreContent = riskStoreContent.replace("const MOCK_USER_ID = '11111111-1111-1111-1111-000000000002';", "const MOCK_TENANT_ID = ACTIVE_TENANT_ID;\nconst MOCK_USER_ID = getUserId();");

fs.writeFileSync(riskStorePath, riskStoreContent);
console.log('risk store modified to use real ID.');

