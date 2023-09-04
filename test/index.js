const {Deezer} = require("../dist/index.js");

const deezer = new Deezer();
const data = deezer.resolve({query:"https://deezer.page.link/swdx3ipfyvMueDrK9"})
//.then(x => console.log(x))