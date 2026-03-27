async function requireAuth(req, res, next) {
  const token = req.cookies['sb-access-token'];
  if (!token) {
    return res.redirect('/login');
  }

  const { data: { user }, error } = await req.supabase.auth.getUser(token);
  if (error || !user) {
    res.clearCookie('sb-access-token');
    return res.redirect('/login');
  }

  // Get user profile for role
  const { data: profile } = await req.supabaseAdmin.from('profiles').select('*').eq('id', user.id).single();

  if (profile && profile.status === 'inactive') {
    res.clearCookie('sb-access-token');
    return res.status(403).send('Akun Anda dinonaktifkan oleh administrator.');
  }

  req.user = { ...user, ...profile };
  res.locals.user = req.user;
  res.locals.isAdmin = req.user.role === 'admin';
  next();
}

async function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).send('Akses Ditolak. Halaman ini hanya untuk admin.');
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
