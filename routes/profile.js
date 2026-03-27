const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', (req, res) => {
  res.render('profile', { error: null, success: null });
});

router.post('/name', async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.render('profile', { error: 'Nama tidak boleh kosong.', success: null });
  }

  // Update in profiles table
  const { error } = await req.supabaseAdmin.from('profiles').update({ name }).eq('id', req.user.id);
  
  if (error) {
    return res.render('profile', { error: 'Gagal memperbarui nama.', success: null });
  }

  // Also update auth user metadata
  await req.supabase.auth.updateUser({ data: { name } });

  // Refresh user object in memory for this request
  req.user.name = name;
  res.locals.user.name = name;

  res.render('profile', { error: null, success: 'Nama berhasil diperbarui!' });
});

router.post('/password', async (req, res) => {
  const { password, confirmPassword } = req.body;
  
  if (password !== confirmPassword) {
    return res.render('profile', { error: 'Password tidak cocok.', success: null });
  }
  if (password.length < 6) {
    return res.render('profile', { error: 'Password minimal 6 karakter.', success: null });
  }

  const { error } = await req.supabase.auth.updateUser({ password });

  if (error) {
    return res.render('profile', { error: error.message, success: null });
  }

  res.render('profile', { error: null, success: 'Password berhasil diperbarui!' });
});

router.post('/budget', async (req, res) => {
  const budget = parseFloat(req.body.monthly_budget) || 0;
  const { error } = await req.supabaseAdmin.from('profiles')
    .update({ monthly_budget: budget })
    .eq('id', req.user.id);
    
  if(error) return res.render('profile', { error: 'Gagal menyimpan anggaran.', success: null });
  req.user.monthly_budget = budget;
  res.locals.user.monthly_budget = budget;
  res.render('profile', { error: null, success: 'Target Anggaran berhasil disimpan!' });
});

module.exports = router;
