import pageRoutes from './router_config'
// ref: https://umijs.org/config/
export default {
    treeShaking: true,
    plugins: [
      // ref: https://umijs.org/plugin/umi-plugin-react.html
      ['umi-plugin-react', {
        antd: true,
        dva: true,
        dynamicImport: { webpackChunkName: true },
        title: 'empty-project',
        dll: true,
      }],
    ],
    routes: pageRoutes,
    disableRedirectHoist: true,
    proxy: {
        "/api": {
        "target": "http://192.168.0.89:8780",//张屹林
        "changeOrigin": true,
        "pathRewrite": { "^/api" : "" } 
        }
    }
  }