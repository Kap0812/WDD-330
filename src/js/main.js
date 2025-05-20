import ProductList from './ProductList.mjs';
import { getData } from './productData.mjs';

// Initialize product list
const dataSource = getData();
const listElement = document.querySelector('.product-list');
const tents = new ProductList('tents', dataSource, listElement);
tents.init();