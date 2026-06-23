const requiredInProd = ['AUTH_SECRET'];

if (process.env.NODE_ENV === 'production') {
  for (const key of requiredInProd) {
    if (!process.env[key]) {
      console.error(`\n✗ MISSING REQUIRED ENV VAR: ${key}`);
      console.error(`  Set ${key} in your production environment.\n`);
      process.exit(1);
    }
  }
}
