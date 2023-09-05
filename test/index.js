const {Deezer} = require("../dist/index.js");

const deezer = new Deezer();
const data = deezer.resolve({query:"tum hi ho",source:"deezer",requester:"test"}).then(x => console.log(x))

