const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.redirect('/dashboard'));

router.get('/login', (req, res) => {
  if(req.cookies['sb-access-token']) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await req.supabase.auth.signInWithPassword({ email, password });
  
  if (error) return res.render('login', { error: error.message });

  res.cookie('sb-access-token', data.session.access_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
  res.redirect('/dashboard');
});

router.get('/register', (req, res) => res.render('register', { error: null }));

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const { data, error } = await req.supabase.auth.signUp({
    email, password, options: { data: { name } }
  });

  if (error) return res.render('register', { error: error.message });

  if (data.session) {
    res.cookie('sb-access-token', data.session.access_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    return res.redirect('/dashboard?registered=1');
  }
  res.redirect('/login?registered=1');
});

router.get('/logout', (req, res) => {
  res.clearCookie('sb-access-token');
  res.redirect('/login');
});

// Forgot Password Flow
router.get('/forgot-password', (req, res) => {
  res.render('forgot-password', { error: null, success: null });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const { error } = await req.supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${req.protocol}://${req.get('host')}/reset-password`
  });

  if (error) return res.render('forgot-password', { error: error.message, success: null });
  res.render('forgot-password', { error: null, success: "Instruksi reset password telah dikirim ke email Anda." });
});

router.get('/reset-password', (req, res) => {
  // If user lands here from email link, Supabase handles auth via hash on client.
  // We just render the form.
  res.render('reset-password');
});

router.post('/reset-password', async (req, res) => {
  const { password } = req.body;
  // Supabase auth.updateUser works for the currently authenticated user (via token in cookie/session)
  const { error } = await req.supabase.auth.updateUser({ password });

  if (error) return res.json({ success: false, error: error.message });
  res.json({ success: true });
});

module.exports = router;
