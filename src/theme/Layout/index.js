import React from 'react';
import Layout from '@theme-original/Layout';
import useImageLightbox from '../utils/useImageLightbox';

export default function LayoutWrapper(props) {
  useImageLightbox();
  return <Layout {...props} />;
}
