import WelcomeLogo from '../assets/brand/logoInicial.svg';
import AuthLogo from '../assets/brand/logoLoginRegister.svg';
import CatalogLogo from '../assets/brand/logoCatalogo.svg';

const variants = {
  welcome: {
    Component: WelcomeLogo,
    width: 220,
    height: 305.325,
    accessibilityLabel: 'Logo OMA - boas-vindas',
  },
  auth: {
    Component: AuthLogo,
    width: 220,
    height: 175.298,
    accessibilityLabel: 'Logo OMA',
  },
  catalog: {
    Component: CatalogLogo,
    width: 118,
    height: 49.908,
    accessibilityLabel: 'Logo OMA',
  },
};

export function BrandLogo({ variant = 'catalog', style }) {
  const { Component, width, height, accessibilityLabel } = variants[variant];

  return (
    <Component
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      height={height}
      style={style}
      width={width}
    />
  );
}
