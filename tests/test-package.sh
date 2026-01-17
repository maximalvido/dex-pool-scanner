#!/bin/bash
# test-package.sh

echo "Building package..."
npm run build

echo "Creating tarball..."
npm pack

echo "Testing installation..."
mkdir -p /tmp/test-npm-package
cd /tmp/test-npm-package
npm init -y
npm install /Users/mmalvido/Development/Personal/dex-pool-scanner/dex-pool-scanner-1.0.0.tgz

echo "Checking installed package..."
ls -la node_modules/dex-pool-scanner/

echo "Testing import..."
node -e "import('dex-pool-scanner').then(m => console.log('✅ Package works!', Object.keys(m)))"

echo "Cleaning up..."
cd -
rm -rf /tmp/test-npm-package