import Olx from "./olx-scraper.js";

const example = async () => {
  const olx = new Olx();
  await olx.init();

  const listing = await olx.getListingByUrl("https://olx.ba/artikal/54240081/");
  console.log(listing);

  await olx.close();
}

example();