// @ts-check
const xml = require('fast-xml-parser')
const fs = require('fs-extra')
const path = require('path')
const { SingleBar } = require('cli-progress')

const argv = require('yargs').argv

const root = path.resolve(__dirname, '..')
const temp = path.join(root, 'Temp')
// @ts-ignore
const input = path.join(temp, argv.input || 'train_data_export')
const output = path.join(temp, `data_${Date.now()}`)
const output_img = path.join(output, 'img')
const bar = new SingleBar({})
const set_classes = new Set()

fs.ensureDirSync(output)
fs.ensureDirSync(output_img)

/**
 * @param {string[]} names
 */
function generateLabeling(names) {
  const result = []

  bar.start(names.length, 0)

  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    const xml_name = name + '.xml'
    const img_name = name + '.jpg'
    const o = xml.parse(fs.readFileSync(path.join(input, xml_name)).toString())
    const img_out = path.join(output, 'img', img_name)
    fs.copyFileSync(path.join(input, img_name), img_out)
    if ('object' in o.annotation) {
      const objects = o.annotation.object instanceof Array ? o.annotation.object : [o.annotation.object]
      for (const object of objects) {
        set_classes.add(object.name)
        result.push(`${img_out},${object.bndbox.xmin},${object.bndbox.ymin},${object.bndbox.xmax},${object.bndbox.ymax},${object.name}`)
      }
    } else {
      result.push(`${img_out},,,,,`)
    }
    bar.increment(1)
  }

  bar.stop()
  return result.join('\n')
}

function generateClassMapping() {
  const classes = [...set_classes]
  const result = []
  classes.forEach((c, i) => result.push(`${c},${i}`))
  return result.join('\n')
}

try {
  const files = fs.readdirSync(input)
  const set1 = new Set(files)
  const set2 = new Set()

  files.forEach(file => set2.add(path.basename(file, path.extname(file))))

  const names = [...set2].filter(x => set1.has(x + '.jpg') && set1.has(x + '.xml'))
  console.log('Total images', names.length)
  // @ts-ignore
  const val = 'val' in argv ? parseFloat(argv.val) : 1
  const val_count = Math.floor(val * names.length)
  const data_count = names.length - val_count
  console.log(`Data / Val = ${data_count} / ${val_count}`)
  const data = names.splice(0, data_count)
  fs.writeFileSync(path.join(output, 'labels.csv'), generateLabeling(data))
  if (val_count > 0) {
    fs.writeFileSync(path.join(output, 'val.csv'), generateLabeling(names))
  }
  fs.writeFileSync(path.join(output, 'classes.csv'), generateClassMapping())
} catch (e) {
  console.error(e)
  fs.removeSync(output)
} finally {
  console.log('DONE')
}
