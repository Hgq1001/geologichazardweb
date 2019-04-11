export default [
  {
    path: '/',
    component: '../layouts',
    routes: [
      { path: '/', redirect: '/home' },
      { path: '/home', component: './Home/Home' },
    ],
  },
];
