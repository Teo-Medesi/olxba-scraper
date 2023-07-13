import Olx from "./olx-scraper.js";

const example = async () => {
  const olx = new Olx();
  await olx.init();

  const categories = await olx.getCategories();
  const category = await categories.getCategory("Vozila");
  const listings = await category.getListings();
  const listing = await listings.getListing(listings.getAllListings()[0].url);
  console.log(listing);


  await olx.close();
}

example();