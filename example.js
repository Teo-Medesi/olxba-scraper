import Olx from "./olxba-scraper.js";

const example = async () => {
  const olx = new Olx();
  await olx.init();

  // run code here

  await olx.close();
}

example();