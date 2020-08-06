const xml = require('fast-xml-parser')
const fs = require('fs-extra')
const path = require('path')
const { SingleBar } = require('cli-progress')

const argv = require('yargs').argv

const W = 1280
const H = 720

const root = path.resolve(__dirname, '..')
const temp = path.join(root, 'Temp')
// @ts-ignore
const input = path.join(temp, 'data_in')
const output = path.join(temp, `data_yolo`)
const bar = new SingleBar({})
const classes = ['red_stop', 'green_go', 'yellow_back', 'pedestrian_crossing', 'speed_limited', 'speed_unlimited']
const index = Object.create(null)
classes.forEach((x, i) => index[x] = i)

fs.ensureDirSync(output)

/**
 * @param {string} alias 
 * @param {string[]} names
 */
function generate(alias, names) {
  const img_out = path.join(output, 'images/' + alias)
  const lab_out = path.join(output, 'labels/' + alias)
  fs.ensureDirSync(img_out)
  fs.ensureDirSync(lab_out)
  bar.start(names.length, 0)
  for (const name of names) {
    const xml_name = name + '.xml'
    const img_name = name + '.jpg'
    const o = xml.parse(fs.readFileSync(path.join(input, xml_name)).toString())
    const img_path = path.join(img_out, img_name)
    const lab_path = path.join(lab_out, name + '.txt')
    if ('object' in o.annotation) {
      const objects = o.annotation.object instanceof Array ? o.annotation.object : [o.annotation.object]
      const result = []
      for (const object of objects) {
        const x1 = object.bndbox.xmin / W
        const y1 = object.bndbox.ymin / H
        const x2 = object.bndbox.xmax / W
        const y2 = object.bndbox.ymax / H
        result.push([
          index[object.name],
          (x1 + x2) / 2,
          (y1 + y2) / 2,
          (x2 - x1),
          (y2 - y1)
        ].join(' '))
      }
      fs.copyFileSync(path.join(input, img_name), img_path)
      fs.writeFileSync(lab_path, result.join('\n'))
    }
    bar.increment(1)
  }

  bar.stop()
}

try {
  const files = fs.readdirSync(input)
  const set1 = new Set(files)
  const set2 = new Set()

  files.forEach(file => set2.add(path.basename(file, path.extname(file))))

  const names = [...set2].filter(x => set1.has(x + '.jpg') && set1.has(x + '.xml'))
  console.log('Total images', names.length)

  if ('vals' in argv) {
    const list = fs.readFileSync(argv.vals).toString().split('\n').map(x => x.trim()).filter(x => x)
    const val_names = names.filter(x => list.includes(x))
    const data_names = names.filter(x => !list.includes(x))
    console.log(`Data / Val = ${data_names.length} / ${val_names.length}`)
    generate('train', data_names)
    generate('val', val_names)
  } else {
    const val = 'val' in argv ? parseFloat(argv.val) : 1
    if ('repeat' in argv) {
      const vals = names.filter(() => Math.random() < val)
      console.log(`Data / Val = ${names.length} / ${vals.length}`)
      generate('train', names)
      generate('val', vals)
    } else {
      const val_count = Math.floor(val * names.length)
      const data_count = names.length - val_count
      console.log(`Data / Val = ${data_count} / ${val_count}`)
      const data = names.splice(0, data_count)
      generate('train', data)
      generate('val', names)
    }
  }
} catch (e) {
  console.error(e)
  fs.removeSync(output)
} finally {
  console.log('DONE')
}
