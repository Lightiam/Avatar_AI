const path = require('path');

module.exports = function override(config, env) {
  // Add a rule for .wasm files
  config.module.rules.push({
    test: /\.wasm$/,
    type: 'webassembly/async',
  });

  // Enable WebAssembly
  config.experiments = {
    asyncWebAssembly: true,
  };

  // Resolve .wasm extension
  config.resolve.extensions.push('.wasm');

  return config;
};
