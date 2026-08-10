import 'dotenv/config';
import app from './app';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

app.listen(PORT, () => {
  console.log(`\n🚀 Trinidad Loan API Server running`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   CORS Origins: ${process.env.CORS_ORIGINS || 'localhost defaults'}`);
  console.log(`\n   Endpoints:`);
  console.log(`   • POST /api/applications          — Submit loan application`);
  console.log(`   • POST /api/documents/upload      — Upload KYC document`);
  console.log(`   • GET  /api/admin/applications    — List all applications`);
  console.log(`   • PATCH /api/admin/:id/status     — Update application status`);
  console.log(`   • GET  /health                    — Health check (no auth)\n`);
});
