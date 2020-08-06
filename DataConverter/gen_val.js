const fs = require('fs')

const data = fs.readdirSync('.')
  .filter(x => x.endsWith('.jpg'))
  .map(x => x.substring(0, x.length - 4))
  .join('\n')

fs.writeFileSync('vals.txt', data)
