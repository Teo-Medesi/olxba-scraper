import Olx from "./olx-scraper.js";

const example = async () => {
  const olx = new Olx();
  await olx.init();

  const categories = await olx.getCategories();
  const category = await categories.getCategory("Vozila");
  const listings = await category.getListings();

  console.log(listings.getAllListings());

  await olx.close();
}

example();