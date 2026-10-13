import { ComponentResolver } from '@uni-helper/vite-plugin-uni-components';
import { FilterPattern } from 'vite';

interface UniTreeViewResolverOptions {
    exclude?: FilterPattern;
}
declare function UniTreeViewResolver(options?: UniTreeViewResolverOptions): ComponentResolver;

export { UniTreeViewResolver };
export type { UniTreeViewResolverOptions };
