const { getDefaultConfig } = require('expo/metro-config');

const expoTransformerPath = getDefaultConfig(__dirname).transformer.babelTransformerPath;
const expoTransformer = require(expoTransformerPath);

module.exports.transform = ({ filename, src, ...options }) => {
  if (!filename.toLowerCase().endsWith('.svg')) {
    return expoTransformer.transform({ filename, src, ...options });
  }

  // Keep the original SVG markup intact; SVGR's native transform drops filter primitives.
  const moduleSource = [
    "import React from 'react';",
    "import { SvgXml } from 'react-native-svg';",
    `const xml = ${JSON.stringify(src)};`,
    'export default function SvgAsset(props) {',
    '  return React.createElement(SvgXml, { ...props, xml });',
    '}',
  ].join('\n');

  return expoTransformer.transform({ filename, src: moduleSource, ...options });
};
