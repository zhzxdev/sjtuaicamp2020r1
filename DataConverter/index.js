const xml = require('fast-xml-parser')
const fs = require('fs-extra')
const path = require('path')
const { SingleBar } = require('cli-progress')

const root = path.resolve(__dirname, '..')
const temp = path.join(root, 'Temp')
const input = path.join(temp, 'train_data_export')
const output = path.join(temp, `data_${Date.now()}`)
const output_img = path.join(output, 'img')
const bar = new SingleBar({})

fs.ensureDirSync(output)
fs.ensureDirSync(output_img)

try {
  const files = fs.readdirSync(input)
  const set1 = new Set(files)
  const set2 = new Set()

  files.forEach(file => set2.add(path.basename(file, path.extname(file))))

  const names = [...set2].filter(x => set1.has(x + '.jpg') && set1.has(x + '.xml'))
  console.log('Total images', names.length)

  const result = []

  bar.start(names.length, 0)

  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    const xml_name = name + '.xml'
    const img_name = name + '.jpg'
    const o = xml.parse(fs.readFileSync(path.join(input, xml_name)).toString())
    fs.copyFileSync(path.join(input, img_name), path.join(output, 'img', img_name))
    if ('object' in o.annotation) {
      const objects = o.annotation.object instanceof Array ? o.annotation.object : [o.annotation.object]
      for (const object of objects) {
        result.push(`./img/${img_name},${object.bndbox.xmin},${object.bndbox.ymin},${object.bndbox.xmax},${object.bndbox.ymax},${object.name}`)
      }
    } else {
      result.push(`./img/${img_name},,,,,`)
    }
    bar.increment(1)
  }

  bar.stop()
  fs.writeFileSync(path.join(output, 'labels.csv'), result.join('\n'))
} catch (e) {
  console.error(e)
  fs.removeSync(output)
} finally {
  console.log('DONE')
}
