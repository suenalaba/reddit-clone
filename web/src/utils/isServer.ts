export const isServer = () => typeof window === 'undefined';
//if undefined means we are on the server, if window is active, can access, in browser, defined.