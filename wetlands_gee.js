    // ------------- IMAGE ACQUISITION ------------- //

// ------------- LANDSAT 7 2002 --------------- //

/**
 * Function to mask clouds using the Landsat-7 QA band
 * @param {ee.Image} image Landsat-7 image
 * @return {ee.Image} cloud masked Landsat-7 image
 */

var cloudMaskL457 = function(image) {
  var qa = image.select('QA_PIXEL');
  // If the cloud bit (5) is set and the cloud confidence (7) is high
  // or the cloud shadow bit is set (3), then it's a bad pixel.
  var cloud = qa.bitwiseAnd(1 << 5)
                  .and(qa.bitwiseAnd(1 << 7))
                  .or(qa.bitwiseAnd(1 << 3));
  // Remove edge pixels that don't occur in all bands
  var mask2 = image.mask().reduce(ee.Reducer.min());
  return image.updateMask(cloud.not()).updateMask(mask2);
};

var data = ee.ImageCollection("LANDSAT/LE07/C02/T1_TOA")
  .filterDate('1999-01-01', '2002-12-31')
  .filterBounds(aoi)
  .filterMetadata("CLOUD_COVER", "less_than", 10)
  .map(cloudMaskL457);
    
var landsat7_2002 = data.median().clip(aoi);
var Vis = { 
  bands: ['B3', 'B2', 'B1'],
  min: 0.0,
  max: 0.4,
  gamma: 1.2,
};

Map.centerObject(aoi, 8); 
// Map.addLayer(landsat7_2002, Vis, 'Landsat 7 2002');
// Map.addLayer(image02, {min: 0, max: 3, palette: ['pink', 'green', 'red', 'blue']}, 'image02');
// Map.addLayer(image12, {min: 0, max: 3, palette: ['pink', 'green', 'red', 'blue']}, 'image12');
// Map.addLayer(image22, {min: 0, max: 3, palette: ['pink', 'green', 'red', 'blue']}, 'image22');
// ------------- LANDSAT 5 2012 --------------- //
/**
 * Function to mask clouds using the Landsat-5 QA band
 * @param {ee.Image} image Landsat-5 image
 * @return {ee.Image} cloud masked Landsat-5 image
 */

var cloudMaskL457 = function(image) {
  var qa = image.select('QA_PIXEL');
  // If the cloud bit (5) is set and the cloud confidence (7) is high
  // or the cloud shadow bit is set (3), then it's a bad pixel.
  var cloud = qa.bitwiseAnd(1 << 5)
                  .and(qa.bitwiseAnd(1 << 7))
                  .or(qa.bitwiseAnd(1 << 3));
  // Remove edge pixels that don't occur in all bands
  var mask2 = image.mask().reduce(ee.Reducer.min());
  return image.updateMask(cloud.not()).updateMask(mask2);
};

var dataset = ee.ImageCollection("LANDSAT/LT05/C02/T1_TOA")
  .filterDate('2009-01-01', '2012-05-31')
  .filterBounds(aoi)
  .filterMetadata("CLOUD_COVER", "less_than", 10)
  .map(cloudMaskL457);
  
var landsat5_2012 = dataset.median().clip(aoi);
var Vis = {
  bands: ['B3', 'B2', 'B1'],
  min: 0.0,
  max: 0.4,
  gamma: 1.2,
};

Map.centerObject(aoi, 8);
// Map.addLayer(landsat5_2012, Vis, 'Landsat 5 2012');


//------------------ LANDSAT 8 2022 --------------------- //

/**
 * Function to mask clouds using the Landsat-8 PIXEL_QA band
 * @param {ee.Image} image Landsat-8 image
 * @return {ee.Image} cloud masked Landsat-8 image
 */

var getQABits = function(image, start, end, newName) {
    // Compute the bits we need to extract.
    var pattern = 0;
    for (var i = start; i <= end; i++) {
       pattern += Math.pow(2, i);
    }
    // Return a single band image of the extracted QA bits, giving the band
    // a new name.
    return image.select([0], [newName])
                  .bitwiseAnd(pattern)
                  .rightShift(start);
};

// A function to mask out cloudy pixels.
var cloud_shadows = function(image) {
  // Select the QA band.
  var QA = image.select(['QA_PIXEL']);
  // Get the internal_cloud_algorithm_flag bit.
  return getQABits(QA, 4,4, 'cloud_shadows').eq(0);
  // Return an image masking out cloudy areas.
};

// A function to mask out cloudy pixels.
var clouds = function(image) {
  // Select the QA band.
  var QA = image.select(['QA_PIXEL']);
  // Get the internal_cloud_algorithm_flag bit.
  return getQABits(QA, 3,3, 'Cloud').eq(0);
  // Return an image masking out cloudy areas.
};

var maskClouds = function(image) {
  var cs = cloud_shadows(image);
  var c = clouds(image);
  image = image.updateMask(cs);
  return image.updateMask(c);
};

var visParams = {
  bands: ['B4', 'B3', 'B2'], 
  min:0,
  max: 0.3
};

var collection = ee.ImageCollection("LANDSAT/LC08/C02/T1_TOA")
    .filterDate('2020-01-01', '2021-05-31')
    .filterBounds(aoi)
    .map(maskClouds);

var landsat8_2022 = collection.median().clip(aoi);

var visualization = {
  bands: ['B4', 'B3', 'B2'],
  min: 0.0,
  max: 0.3,
};

Map.centerObject(aoi, 8);
// Map.addLayer(landsat8_2022, visualization, 'Landsat 8 2022');

// ---------- Feature extraction ------------ //

// lets extract mndwi, ndvi and evi indices to use in classification
// mndwi = (Green - SWIR)/(Green + SWIR)
var mndwi7_02 = landsat7_2002.normalizedDifference(['B2', 'B7']).rename('NDWI');
var landsat7_2002 = landsat7_2002.addBands(mndwi7_02);

var mndwi5_12 = landsat5_2012.normalizedDifference(['B2', 'B7']).rename('NDWI');
var landsat5_2012 = landsat5_2012.addBands(mndwi5_12);

var mndwi8_22 = landsat8_2022.normalizedDifference(['B3', 'B7']).rename('NDWI');
var landsat8_2022 = landsat8_2022.addBands(mndwi8_22);

// ndvi = (NIR - Red)/(NIR + Red)
var ndvi7_02 = landsat7_2002.normalizedDifference(['B3', 'B4']).rename('NDVI');
var landsat7_2002 = landsat7_2002.addBands(ndvi7_02);

var ndvi5_12 = landsat5_2012.normalizedDifference(['B3', 'B4']).rename('NDVI');
var landsat5_2012 = landsat5_2012.addBands(ndvi5_12);

var ndvi8_22 = landsat8_2022.normalizedDifference(['B4', 'B5']).rename('NDVI');
var landsat8_2022 = landsat8_2022.addBands(ndvi8_22);

// EVI = G * {(NIR - Red)/(NIR + C1 * Red - C2 * Blue + L)}
// evi landsat 7 2002
var EVI02 = landsat7_2002.expression(
    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
        'NIR': landsat7_2002.select('B4'),
        'RED': landsat7_2002.select('B3'),
        'BLUE': landsat7_2002.select('B1')
      }).rename("EVI")

var landsat7_2002 = landsat7_2002.addBands(EVI02)
// print('Landsat 7 2002', landsat7_2002)

// evi landsat 5 2012
var EVI12 = landsat5_2012.expression(
    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
        'NIR': landsat5_2012.select('B4'),
        'RED': landsat5_2012.select('B3'),
        'BLUE': landsat5_2012.select('B1')
      }).rename("EVI")

var landsat5_2012 = landsat5_2012.addBands(EVI12)
// print('Landsat 5 2012', landsat5_2012)

// evi landsat 8 2022
var EVI22 = landsat8_2022.expression(
    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
        'NIR': landsat8_2022.select('B5'),
        'RED': landsat8_2022.select('B4'),
        'BLUE': landsat8_2022.select('B2')
      }).rename("EVI")

var landsat8_2022 = landsat8_2022.addBands(EVI22)
// print('Landsat 8 2022', landsat8_2022)

// ------------- Deriving training points ---------------//

// merge classes to feature collection
var FCmerged = wetlands.merge(vegetation).merge(urban).merge(water); 

//Stratified Random Sampling: 

var FCimage = ee.Image().byte().paint(FCmerged, "class").rename("LC")
// print(FCimage, 'image'); 

var stratifiedsample = FCimage.stratifiedSample({
  numPoints:10000,
  classBand:'LC',
  region:aoi,
  scale:30,
  classValues:[0,1,2,3],
  classPoints:[1500,1500,1500,1500],
  geometries:true
});

print('Stratified samples', stratifiedsample); 
print(stratifiedsample.reduceColumns(ee.Reducer.frequencyHistogram(),['LC']).get('histogram','No of points'));
Map.addLayer(stratifiedsample, {}, 'Stratified Samples', false);

// ------------------ Extract pixel values ---------------------//

var stratifiedTraining02 = landsat7_2002.sampleRegions({
  tileScale: 3,
  collection: stratifiedsample,
  properties:['LC'],
  geometries: true,
  scale:30,
});

var stratifiedTraining12 = landsat5_2012.sampleRegions({
  tileScale: 3,
  collection: stratifiedsample,
  properties:['LC'],
  geometries: true,
  scale:30,
});

var stratifiedTraining22 = landsat8_2022.sampleRegions({
  tileScale: 3,
  collection: stratifiedsample,
  properties:['LC'],
  geometries: true,
  scale:30,
});

// ------------- Split Training and Validation data --------------- //
// add a random column
var stratifiedTraining22 = stratifiedTraining22.randomColumn();

// split your **full** sample into training and validation points to keep them independent of each other
var trainingSample = stratifiedTraining22.filter('random <= 0.8');
var validationSample = stratifiedTraining22.filter('random > 0.8');

// --------------- Train Random Forest Classifier ----------------//

// select bands for classification
var bands57 = ['B1', 'B2', 'B3', 'B4', 'NDWI', 'NDVI', 'EVI']
var bands8 = ['B2', 'B3', 'B4', 'B5', 'NDWI', 'NDVI', 'EVI']

// RF classifier
var RFclassifier02 = ee.Classifier.smileRandomForest(100).train({
  features: trainingSample,
  classProperty: 'LC',
  inputProperties: bands57,
});

var RFclassifier12 = ee.Classifier.smileRandomForest(100).train({
  features: trainingSample,
  classProperty: 'LC',
  inputProperties: bands57,
});

var RFclassifier22 = ee.Classifier.smileRandomForest(100).train({
  features: trainingSample,
  classProperty: 'LC',
  inputProperties: bands8,
});

// --------------------- Classify the images -----------------------//
// landsat 7 2002 classification
var classifiedImage2002 = landsat5_2002.classify(RFclassifier02);

//confusion matrix about the resubstitution accuracy 
var trainAccuracy_2002 = RFclassifier02.confusionMatrix()
print('2002 Resubstitution error matrix: ', trainAccuracy_2002)
print('2002 Training overall accuracy: ', trainAccuracy_2002.accuracy())
print('2002 Training Kappa index:', trainAccuracy_2002.kappa())

// landsat 5 2012 classification
var classifiedImage2012 = landsat5_2012.classify(RFclassifier12);

// confusion matrix about the resubstitution accuracy 
var trainAccuracy_2012 = RFclassifier12.confusionMatrix()
print('2012 Resubstitution error matrix: ', trainAccuracy_2012)
print('2012 Training overall accuracy: ', trainAccuracy_2012.accuracy())
print('2012 Training Kappa index:', trainAccuracy_2012.kappa())

// landsat 8 2022 classification
var classifiedImage2022 = landsat8_2022.classify(RFclassifier22);

var trainAccuracy_2022 = RFclassifier22.confusionMatrix()
print('2022 Resubstitution error matrix: ', trainAccuracy_2022)
print('2022 Training overall accuracy: ', trainAccuracy_2022.accuracy())
print('2022 Training Kappa index:', trainAccuracy_2022.kappa())
Map.addLayer(classifiedImage2002, {min: 0, max: 3, palette: ['pink', 'green', 'red', 'blue']}, 'Landsat 7 2002 Classified');
Map.addLayer(classifiedImage2012, {min: 0, max: 3, palette: ['pink', 'green', 'red', 'blue']},  'Landsat 5 2012 Classified');
Map.addLayer(classifiedImage2022, {min: 0, max: 3, palette: ['pink', 'green', 'red', 'blue']}, 'Landsat 8 2022 Classified');

// -------------- Classify validation set ------------------//
// classify the validation sample
var validation = validationSample.classify(RFclassifier22)

// Get a confusion matrix representing expected accuracy of **test data (validation sample)** 
var testAccuracy = validation.errorMatrix('LC', 'classification')
// print(testAccuracy)
// print('2022 Testing accuracy', testAccuracy.accuracy())

// --------------- EXPORT TO ASSET ------------------ //
// Export to asset
Export.image.toAsset({
  image: classifiedImage2022.clip(aoi),
  description: 'classified2022',
  assetId: 'projects/ee-kimeu11/assets/classified2022',  // <> modify these
  region: aoi,
  scale: 30,
  crs: 'EPSG:4326',
});


// ------------------------- LEGEND --------------------------//
// Class color and label info.
var classInfo = [
  {name: 'Wetlands', color: 'pink'},
  {name: 'Vegetation', color: 'green'},
  {name: 'Urban/Bare', color: 'red'},
  {name: 'Water', color: 'blue'}
];

// Makes a legend entry: color and label side-by-side in a panel.
function legendEntry(info) {
  var color = ui.Panel({style: {
    width: '20px',
    height: '20px',
    backgroundColor: info.color,
    margin: '6px 0px 0px 0px'
  }});
  var label = ui.Label({
    value: info.name,
  });
  return ui.Panel({
    widgets: [color, label],
    layout: ui.Panel.Layout.flow('horizontal'),
    style: {
      stretch: 'horizontal',
      margin: '-6px 0px 0px 0px'
    }});
}

// Define a panel to hold all legend entries.
var legend = ui.Panel({
  style: {
    position: 'top-left',
    padding: '8px 8px 0px 8px' 
  }
});
// Legend title
// Create legend title
var legendTitle = ui.Label({
  value: '2012',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
}});

// Add the title to the panel
legend.add(legendTitle);

// Loop through the map classes, add each entry to the legend panel.
for (var i = 0; i < classInfo.length; i++) {
  legend.add(legendEntry(classInfo[i]));
}

// Show legend on the map.
Map.add(legend);

// ---------------------- CHANGE DETECTION-------------------- //
// ---------------------- Image Difference -------------------- //

// compute image difference between 2002 and 2012
var difference02_12 = image12.subtract(image02);
// print(image02)
// print(difference02_12)
var reclassified = difference02_12.expression('b(0) < 0 ? -1 : b(0) == 0 ? 0 : 1');
Map.addLayer(reclassified.clip(aoi), {min: -1, max: 1, palette: ['#0096a0', '#ffbb22', '#fa0000']}, 'image difference');

 
// compute image difference between 2012 and 2022
var difference12_22 = image22.subtract(image12);
// print(image02)
print(difference12_22)
var reclassified = difference12_22.expression('b(0) < 0 ? -1 : b(0) == 0 ? 0 : 1');
Map.addLayer(reclassified.clip(aoi), {min: -1, max: 1, palette: ['#0096a0', '#ffbb22', '#fa0000']}, 'image difference');

// compute image difference between 2012 and 2022
var difference02_22 = image22.subtract(image02);
// print(image02)
print(difference02_22)
var reclassified = difference02_22.expression('b(0) < 0 ? -1 : b(0) == 0 ? 0 : 1');
Map.addLayer(reclassified.clip(aoi), {min: -1, max: 1, palette: ['#0096a0', '#ffbb22', '#fa0000']}, 'image difference');
