const fs = require('fs');
const file = './readme.md';

const rs = fs.createReadStream(file);
rs.on('readable', () => {
  const read = rs.read();
  if (read) {
    document.getElementById('readme').innerHTML = marked(read.toString());
  }
});
rs.on('end', (err) => {
  if (err) {
    console.log(err);
  }
  console.log('== EOF ==');
});