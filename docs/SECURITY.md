# Security Notes

- JWT auth with role-based access control is implemented in middleware.
- Passwords are hashed with bcrypt cost 12.
- OTPs are hashed and expire after 10 minutes.
- Phone validation uses `libphonenumber-js`; email and password validators are included.
- All financial actions write to `audit_logs`.
- Payment is not trusted until provider verification succeeds.
- Documents are stored in Cloudinary authenticated folders and signed URLs should be short-lived.
- Use HTTPS only in production.
- Add PostgreSQL RLS policies specific to your production authorization rules before direct client DB access.
