/* eslint-disable no-param-reassign */
/* eslint-disable camelcase */
const fs = require('fs-extra');
const Papa = require('papaparse');
const get = require('lodash.get');
const path = require('path');
const { logger } = require('../../lib/logger');

const { fetchEzUnpaywall } = require('./utils');

let enricherAttributesCSV = [
  'best_oa_location.evidence',
  'best_oa_location.host_type',
  'best_oa_location.is_best',
  'best_oa_location.license',
  'best_oa_location.pmh_id',
  'best_oa_location.updated',
  'best_oa_location.url',
  'best_oa_location.url_for_landing_page',
  'best_oa_location.url_for_pdf',
  'best_oa_location.version',
  'first_oa_location.evidence',
  'first_oa_location.host_type',
  'first_oa_location.is_best',
  'first_oa_location.license',
  'first_oa_location.pmh_id',
  'first_oa_location.updated',
  'first_oa_location.url',
  'first_oa_location.url_for_landing_page',
  'first_oa_location.url_for_pdf',
  'first_oa_location.version',
  'z_authors.family',
  'z_authors.given',
  'z_authors.sequence',
  'data_standard',
  'doi_url',
  'genre',
  'is_paratext',
  'is_oa',
  'journal_is_in_doaj',
  'journal_is_oa',
  'journal_issns',
  'journal_issn_l',
  'journal_name',
  'oa_status',
  'published_date',
  'publisher',
  'title',
  'updated',
  'year',
];

const tmp = path.resolve(__dirname, '..', '..', 'out', 'tmp');
const enrichedFile = path.resolve(tmp, 'enriched.csv');

let fetchAttributes = [];

let best_oa_location = [];
let first_oa_location = [];
let z_authors = [];

let headers = [];
let separator;

let lineRead = 0;
let lineEnrich = 0;

const reset = () => {
  enricherAttributesCSV = [
    'best_oa_location.evidence',
    'best_oa_location.host_type',
    'best_oa_location.is_best',
    'best_oa_location.license',
    'best_oa_location.pmh_id',
    'best_oa_location.updated',
    'best_oa_location.url',
    'best_oa_location.url_for_landing_page',
    'best_oa_location.url_for_pdf',
    'best_oa_location.version',
    'first_oa_location.evidence',
    'first_oa_location.host_type',
    'first_oa_location.is_best',
    'first_oa_location.license',
    'first_oa_location.pmh_id',
    'first_oa_location.updated',
    'first_oa_location.url',
    'first_oa_location.url_for_landing_page',
    'first_oa_location.url_for_pdf',
    'first_oa_location.version',
    'z_authors.family',
    'z_authors.given',
    'z_authors.sequence',
    'data_standard',
    'doi_url',
    'genre',
    'is_paratext',
    'is_oa',
    'journal_is_in_doaj',
    'journal_is_oa',
    'journal_issns',
    'journal_issn_l',
    'journal_name',
    'oa_status',
    'published_date',
    'publisher',
    'title',
    'updated',
    'year',
  ];
  headers = [];
  fetchAttributes = [];
  best_oa_location = [];
  first_oa_location = [];
  z_authors = [];
  lineRead = 0;
  lineEnrich = 0;
};

/**
 * parse the complexes attributes so that they can be used in the graphql query
 * @param {*} name name of param
 * @param {*} attribute attributes of param
 */
const stringifyAttributes = (name, attributes) => {
  let res;
  if (attributes.length !== 0) {
    res = attributes.join(separator);
  }
  res = `${name}{${res}}`;
  return res;
};

/**
 * sortAttr if is a complexe attributes
 * @param {*} attr
 */
const sortAttr = (attr) => {
  // complexe attributes (like best_oa_location.license)
  if (attr.includes('.')) {
    const str = attr.split('.');
    if (str[0] === 'best_oa_location') {
      best_oa_location.push(str[1]);
    }
    if (str[0] === 'first_oa_location') {
      first_oa_location.push(str[1]);
    }
    if (str[0] === 'z_authors') {
      z_authors.push(str[1]);
    }
  } else {
    // simple attributes (like is_oa)
    fetchAttributes.push(attr);
  }
};

/**
 * parse the attributes so that they can be used in the graphql query
 */
const createFetchAttributes = () => {
  if (typeof enricherAttributesCSV === 'string') {
    sortAttr(enricherAttributesCSV);
  } else {
    enricherAttributesCSV.forEach((attr) => {
      sortAttr(attr);
    });
  }

  if (best_oa_location.length !== 0) {
    best_oa_location = stringifyAttributes('best_oa_location', best_oa_location);
    fetchAttributes.push(best_oa_location);
  }
  if (first_oa_location.length !== 0) {
    first_oa_location = stringifyAttributes('first_oa_location', first_oa_location);
    fetchAttributes.push(first_oa_location);
  }
  if (z_authors.length !== 0) {
    z_authors = stringifyAttributes('z_authors', z_authors);
    fetchAttributes.push(z_authors);
  }
};

/**
 * checks if the attributes entered by the command are related to the unpaywall data model
 * @param {*} attrs array of attributes
 */
const checkAttributesCSV = (attrs) => {
  const res = [];
  if (attrs.includes(',')) {
    attrs = attrs.split(',');
    attrs.forEach((attr) => {
      if (enricherAttributesCSV.includes(attr)) {
        res.push(attr);
      } else {
        logger.error(`attribut ${attr} cannot be enriched on CSV file`);
        return false;
      }
    });
  } else if (enricherAttributesCSV.includes(attrs)) {
    res.push(attrs);
  } else {
    logger.error(`attribut ${attrs} cannot be enriched on CSV file`);
    return false;
  }
  return res;
};

/**
 * @param {*} tab array of line that we will enrich
 * @param {*} response response from ez-unpaywall
 */
const enricherTab = (tab, response) => {
  const results = new Map();
  // index on doi
  response.forEach((el) => {
    if (el.doi) {
      results.set(el.doi, el);
    }
  });
  // enrich
  tab.forEach((el) => {
    if (!el.doi) {
      return;
    }
    const data = results.get(el.doi);
    if (!data) {
      return;
    }
    enricherAttributesCSV.forEach((attr) => {
      // if complex attribute (like best_oa_location.url)
      if (attr.includes('.')) {
        const str = attr.split('.');
        const authors = data[str[0]];
        // z_author is the only array attributes on unpaywall schema
        if (Array.isArray(authors)) {
          const [firstAuthor] = authors.filter((a) => a.sequence === 'first');
          if (firstAuthor) {
            el.first_authors = `${firstAuthor.family}, ${firstAuthor.given}`;
          }
          // the first ten other authors
          el.additional_authors = authors.slice(0, 10).map((a) => `${a.family} ${a.given}`).join(',');
        } else {
          el[attr] = get(data, str, 0, str, 1);
        }
        return;
      }
      // simple attributes
      el[attr] = data[attr];
    });
  });
};

/**
 * write the array of line enriched in a enrichedFile file CSV
 * @param {*} tab array of line enriched
 */
const writeInFileCSV = async (tab) => {
  const parsedTab = JSON.stringify(tab);
  try {
    const unparse = await Papa.unparse(parsedTab, {
      header: false,
      delimiter: separator,
      columns: headers,
    });
    await fs.writeFile(enrichedFile, `${unparse}\r\n`, { flag: 'a' });
  } catch (err) {
    logger.error(`writeInFileCSV: ${err}`);
  }
};

/**
 * enrich the header with enricherAttributesCSV
 * @param {*} header header will be enrich
 */
const enricherHeaderCSV = (header) => {
  // delete attributes already in header
  let res = header.filter((el) => !enricherAttributesCSV.includes(el));
  res = res.concat(enricherAttributesCSV);
  const found = res.find((element) => element.includes('z_authors'));
  res = enricherAttributesCSV.filter((el) => !el.includes('z_authors'));
  if (found) {
    res.push('first_authors');
    res.push('additional_authors');
  }
  return header.concat(res);
};

/**
 * first writing on CSV file: the header enriched
 * @param {*} header header enriched
 */
const writeHeaderCSV = async (header) => {
  try {
    await fs.writeFile(enrichedFile, `${header.join(separator)}\r\n`, { flag: 'a' });
  } catch (err) {
    logger.error(`writeHeaderCSV: ${err}`);
  }
};

/**
 * starts the enrichment process for files CSV
 * @param {*} readStream read the stream of the file you want to enrich
 */
const enrichmentFileCSV = async (readStream, attributs, separatorFile) => {
  if (attributs.length) {
    enricherAttributesCSV = attributs;
  }

  createFetchAttributes();

  // TODO use a rotate delete
  // empty the file
  const fileExist = await fs.pathExists(enrichedFile);
  if (fileExist) {
    await fs.unlink(enrichedFile);
  }
  fs.openSync(enrichedFile, 'w');

  separator = separatorFile;

  let tab = [];
  let head = true;
  let loaded = 0;

  readStream.on('data', (chunk) => {
    loaded += chunk.length;
  });

  await new Promise((resolve) => {
    Papa.parse(readStream, {
      delimiter: ',',
      header: true,
      transformHeader: (header) => {
        headers.push(header.trim());
        return header.trim();
      },
      step: async (results, parser) => {
        // first step: write enriched header
        tab.push(results.data);
        if (head) {
          await parser.pause();
          head = false;
          headers = await enricherHeaderCSV(headers, fetchAttributes);
          await writeHeaderCSV(headers);
          await parser.resume();
        }

        if (tab.length === 1000) {
          const tabWillBeEnriched = tab;
          tab = [];
          await parser.pause();
          const response = await fetchEzUnpaywall(tabWillBeEnriched, fetchAttributes);
          enricherTab(tabWillBeEnriched, response);
          lineRead += 1000;
          lineEnrich += response.length;
          await writeInFileCSV(tabWillBeEnriched);
          await parser.resume();
        }
      },
      complete: () => resolve(),
    });
  });
  // last insertion
  if (tab.length !== 0) {
    const response = await fetchEzUnpaywall(tab, fetchAttributes);
    enricherTab(tab, response);
    lineRead += tab.length;
    lineEnrich += response.length;
    await writeInFileCSV(tab);
  }
  logger.info(`${lineEnrich}/${lineRead} lines enriched`);
  reset();
  return true;
};

module.exports = {
  checkAttributesCSV,
  enrichmentFileCSV,
};
