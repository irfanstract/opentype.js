



/** @type {import("eslint").ESLint.ConfigData } */
module.exports = {
  
  "env": {
    "browser": true,
    "es2021": true,
    "node": true
  },
  "plugins": [
    // "eslint-plugin-local-rules",
    "eslint-plugin-import",
  ],
  // "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 2022
    ,
    "sourceType": "module"
  },
  "rules": {
    "import/no-cycle": [
      "error"
    ],
    // "linebreak-style": [
    //   "warn",
    //   "unix"
    // ],
    "semi": [
      "error",
      "always"
    ],
    "no-extra-semi": [
      "off",
    ],
    // "local-rules/import-extensions": 2,
    "import/unused": [
      "off",
    ],
  }
} ;


