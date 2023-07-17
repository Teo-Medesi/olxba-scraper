import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker"

class BaseScraper {
  browser;
  page;

  /**
   * initialize the scraper, must be called before using any of the Olx methods
   * @async
   */
  async init() {
    try {
      puppeteer.use(StealthPlugin()).use(AdblockerPlugin());

      this.browser = await puppeteer.launch();
      this.page = await this.browser.newPage();
      this.page.setDefaultNavigationTimeout(2 * 60 * 1000);
      await this.page.goto("https://olx.ba")
    }
    catch (error) {
      console.error(`Error while during initilization, error: ${error}`);
      await this.browser?.close();
    }
  }

  async close() {
    await this.browser?.close();
  }

}

/**
 * base instance of KupujemProdajem scraper
 * @class
 */
class Olx extends BaseScraper {
  constructor() {
    super();
  }

  /**
   * Retrieves a listing by url
   * @param {String} url the url of the listing you want to get
   * @returns instance of the Listing class
   * @async
   */
  async getListingByUrl(url) {
    try {
      /* title;
      description;
      price;
      location;
      url;
      coverImage;
      characteristics; */
      await this.page.goto(url);
      await this.page.waitForSelector(".details");

      const title = (await this.page.$eval("h1.main-title-listing", element => element.textContent)).trim();
      const price = (await this.page.$eval("span.price-heading", element => element.textContent)).trim();

      const tagElements = await this.page.$$(".btn-pill");
      const tags = [];

      for (const tag of tagElements) {
        const text = (await tag.evaluate(element => element.textContent)).trim();

        tags.push(text);
      }

      await this.page.waitForSelector(".swiper-lazy");
      const coverImage = await this.page.$eval(".swiper-lazy", element => element.src);

      await this.page.waitForSelector("body td");
      const data = await this.page.$$("body td");
      const characteristics = [];

      for (let i = 0; i < data.length; i += 2) {
        try {
          const key = (await data[i].evaluate(element => element.textContent)).trim();
          let value = (await data[i + 1].evaluate(element => element.textContent)).trim();
          let url;

          if (!value) {
            value = (await data[i + 1].$eval("a", (element) => element.textContent)).trim();
            url = await data[i + 1].$eval("a", (element) => element.href);
          }

          characteristics.push({ key, value, ...(url != null && { url }) });
        }
        catch (error) {
          console.error(`Error while getting characteristics, error: ${error}`);
          continue;
        }
      }

      let description = await this.page.$(".ql-editor");
      description = (await description.evaluate(element => element.textContent)).trim();

      return new Listing({ title, price, tags, url, coverImage, characteristics, description }, this.browser, this.page);
    }
    catch (error) {
      console.error(`Error while getting listing, error: ${error}`);
      await this.browser?.close();
    }
  }


  /**
   * Retrieves listings from the first page that matches the keywords query
   * @param {String} keywords keywords to find listing in search 
   * @returns instance of Listings class
   * @async
   */
  async getListingsBySearch(keywords) {
    try {
      await this.page.goto(`https://olx.ba/pretraga?q=${encodeURIComponent(keywords)}`);
      console.log("got to page")

      const data = await this.page.$$(".cardd");
      console.log("got all cards");
      const listings = [];

      for (const listing of data) {

        console.log(listing);

        const title = (await listing?.$eval("h1", (element) => element.textContent)).trim();
        const coverImage = await listing?.$eval("img", (element) => element.src);
        const url = await listing?.$eval("a", (element) => element.href);
        const price = (await listing?.$eval("span.smaller", (element) => element.textContent)).trim();

        const data = await listing?.$$(".standard-tag div");
        const tags = [];

        for (const tag of data) {
          const title = await tag?.evaluate(element => element.textContent);

          tags.push(title);
        }

        listings.push({ title, coverImage, url, price, tags });
      }

      return new Listings(listings, this.browser, this.page);

    }
    catch (error) {
      console.error(`Error while searching for listings, error: ${error}`);
      await this.browser?.close();
    }
  }

  /**
   * Retrieves all categories of website
   * @returns instance of Categories class
   * @async
   */
  async getCategories() {
    try {
      await this.page.goto("https://olx.ba/kategorije");
      await this.page.waitForSelector(".main-categories a");

      const data = await this.page.$$(".main-categories a");
      const categories = [];

      for (const category of data) {
        const name = (await category?.evaluate(element => element.textContent)).trim();
        const url = await category?.evaluate(element => element.href);

        categories.push({ name, url })
      }

      return new Categories(categories, this.browser, this.page)
    }
    catch (error) {
      console.error(`Error while getting categories, error: ${error}`);
      await this.browser?.close();
    }
  }

}

/**
 * @class
 */
class Categories {
  #categories;
  browser;
  #page;

  constructor(categories, browser, page) {
    this.#categories = categories;
    this.browser = browser;
    this.#page = page;
  }

  /**
   * @returns array of category objects with category name and url
   */
  getAllCategories() {
    return this.#categories;
  }

  /**
   * Retrieves category by name
   * @param {String} name exact name of category such as "Alati i Oruđa" 
   * @returns instance of Category class
   */
  async getCategory(name) {
    try {
      const category = this.#categories.find(category => category.name === name);

      return new Category(category.name, category.url, this.browser, this.#page);
    }
    catch (error) {
      console.error(`Error while getting category, error: ${error}`);
      await this.browser?.close();
    }
  }
}

/**
 * @class
 */
class Category {
  name;
  url;
  browser;
  #page;

  constructor(name, url, browser, page) {
    this.name = name;
    this.url = url;
    this.browser = browser;
    this.#page = page;
  }

  /**
   * Retrieves all listings from the first page of a category
   * @returns instance of Listings class
   * @todo add pagination functionality (scrape page 2 and beyond)
   * @async
   */
  async getListings() {
    try {
      await this.#page.goto(this.url);
      await this.#page.waitForSelector(".cardd");

      const data = await this.#page.$$(".cardd");
      const listings = [];

      for (const listing of data) {

        const title = (await listing?.$eval("h1", (element) => element.textContent)).trim();
        const coverImage = await listing?.$eval("img", (element) => element.src);
        const url = await listing?.$eval("a", (element) => element.href);
        const price = (await listing?.$eval("span.smaller", (element) => element.textContent)).trim();

        const data = await listing?.$$(".standard-tag div");
        const tags = [];

        for (const tag of data) {
          const title = await tag?.evaluate(element => element.textContent);

          tags.push(title);
        }

        listings.push({ title, coverImage, url, price, tags });
      }

      return new Listings(listings, this.browser, this.#page);
    }
    catch (error) {
      console.error(`Error while getting listings, error: ${error}`);
      await this.browser?.close();
    }
  }
}

/**
 * @class
 */
class Listings {
  #listings;
  browser;
  #page;

  constructor(listings, browser, page) {
    this.#listings = listings;
    this.browser = browser;
    this.#page = page;
  }

  /**
   * @returns array of listing objects with the properties of title, description, price, location, coverImage and url
   */
  getAllListings() {
    return this.#listings;
  }

  /**
   * Retrieves a listing by url
   * @param {String} url url of listing
   * @returns instance of Listing class
   * @async
   */
  async getListing(url) {
    try {
      const listing = this.#listings.find(listing => listing.url === url);

      await this.#page.goto(url);

      await this.#page.waitForSelector("body td");
      const data = await this.#page.$$("body td");
      const characteristics = [];

      for (let i = 0; i < data.length; i += 2) {
        try {
          const key = (await data[i].evaluate(element => element.textContent)).trim();
          let value = (await data[i + 1].evaluate(element => element.textContent)).trim();
          let url;

          if (!value) {
            value = (await data[i + 1].$eval("a", (element) => element.textContent)).trim();
            url = await data[i + 1].$eval("a", (element) => element.href);
          }

          characteristics.push({ key, value, ...(url != null && { url }) });
        }
        catch (error) {
          console.error(`Error while getting characteristics, error: ${error}`);
          continue;
        }
      }

      let description = await this.#page.$(".ql-editor");
      description = (await description.evaluate(element => element.textContent)).trim();

      return new Listing({ ...listing, characteristics, description }, this.browser, this.#page);
    }
    catch (error) {
      await this.browser?.close();
      console.error(`Error while getting listing, error: ${error}`);
    }
  }
}

/**
 * @class
 */
class Listing {
  title;
  description;
  price;
  location;
  url;
  coverImage;
  characteristics;
  tags;
  browser;
  #page;

  constructor(listing, browser, page) {
    this.title = listing?.title;
    this.price = listing?.price;
    this.location = listing?.location;
    this.url = listing?.url;
    this.description = listing?.description;
    this.coverImage = listing?.coverImage;
    this.characteristics = listing?.characteristics;
    this.tags = listing?.tags;
    this.#page = page;
    this.browser = browser;
  }

  /**
   * Retrieve all images related to listing
   * @returns array of image urls
   * @async
   */
  async getImages() {
    try {
      await this.#page.waitForSelector("img.swiper-lazy");

      const data = await this.#page.$$("img.swiper-lazy");
      const images = [];

      for (const image of data) {
        const url = await image.evaluate(element => element.src);
        url && images.push(url);
      }

      return images;
    }
    catch (error) {
      console.error(`Error while getting images, error: ${error}`);
      await this.browser?.close();
    }
  }
}

export default Olx;

