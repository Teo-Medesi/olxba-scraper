import Olx from "./olx-scraper.js";

const example = async () => {
  const olx = new Olx();
  await olx.init();

  const listings = await olx.getListingsBySearch("traktor");
  console.log(listings.getAllListings());

  await olx.close();
}

example();