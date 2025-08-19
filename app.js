let products = [
  { id: 1, name: "Notebook", stock: 10 },
  { id: 2, name: "Pen", stock: 25 },
  { id: 3, name: "Eraser", stock: 15 }
];

function renderProducts() {
  const list = document.getElementById("product-list");
  list.innerHTML = "";
  products.forEach(p => {
    list.innerHTML += `
      <li>
        ${p.name} - คงเหลือ ${p.stock} ชิ้น
        <button onclick="updateStock(${p.id}, 1)">+ เพิ่ม</button>
        <button onclick="updateStock(${p.id}, -1)">- ลด</button>
      </li>
    `;
  });
}

function updateStock(id, change) {
  const product = products.find(p => p.id === id);
  if (product) {
    product.stock = Math.max(0, product.stock + change);
    renderProducts();
  }
}

window.onload = () => {
  renderProducts();
};
