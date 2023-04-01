// ------------- IMAGE ACQUISITION ------------- //

// ------------------- LANDSAT 8 2014 ------------------------ //
var landsat8_ = ee.ImageCollection('LANDSAT/LC08/C02/T1_TOA')

var collection_ = landsat8_.filterBounds(aoi).filterDate('2015-01-01', '2015-03-31');

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

var landsat8_2014 = collection_.map(maskClouds).median().clip(aoi);

// add layer to map
Map.addLayer(landsat8_2014, {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.2}, 'Landsat 8 Image 2014');


//----------------------- LANDSAT 8 DATA 2020 ----------------------- //

var landsat8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_TOA')

var collection = landsat8.filterBounds(aoi).filterDate('2020-01-01', '2022-03-31');

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

var landsat8_2020 = collection.map(maskClouds).median().clip(aoi);

// add layer to map
Map.addLayer(landsat8_2020, {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.2}, 'Landsat 8 Image 2020');

// ---------- Feature extraction ------------ //

// lets extract mndwi, ndvi and evi indices to use in classification
// mndwi
var mndwi8_14 = landsat8_2014.normalizedDifference(['B3', 'B7']).rename('NDWI');
var landsat8_2014 = landsat8_2014.addBands(mndwi8_14);

var mndwi8_20 = landsat8_2020.normalizedDifference(['B3', 'B7']).rename('NDWI');
var landsat8_2020 = landsat8_2020.addBands(mndwi8_20);

// ndvi
var ndvi8_14 = landsat8_2014.normalizedDifference(['B4', 'B5']).rename('NDVI');
var landsat8_2014 = landsat8_2014.addBands(ndvi8_14);

var ndvi8_20 = landsat8_2020.normalizedDifference(['B4', 'B5']).rename('NDVI');
var landsat8_2020 = landsat8_2020.addBands(ndvi8_20);

// evi landsat 5
var red5 = landsat8_2014.select('B4');
var nir5 = landsat8_2014.select('B5');
var blue5 = landsat8_2014.select('B2');
var l5_1 = nir5.add(6);
var l5_2 = red5.subtract(7.5);
var l5_3 = blue5.add(1);
var l5_4 = l5_1.multiply(l5_2).multiply(l5_3);
var evi8_14 = ((nir5.subtract(red5)).divide(l5_4)).multiply(2.5).rename('EVI');
var landsat8_2014 = landsat8_2014.addBands(evi8_14);
// print('Landsat 8 2014', landsat8_2014)

// evi landsat 8
var red8 = landsat8_2020.select('B4');
var nir8 = landsat8_2020.select('B5');
var blue8 = landsat8_2020.select('B2');
var l8_1 = nir8.add(6);
var l8_2 = red8.subtract(7.5);
var l8_3 = blue8.add(1);
var l8_4 = l8_1.multiply(l8_2).multiply(l8_3);
var evi8_20 = ((nir8.subtract(red8)).divide(l8_4)).multiply(2.5).rename('EVI');
var landsat8_2020 = landsat8_2020.addBands(evi8_20);
// print('Landsat 8 2020', landsat8_2020)

// ------------- Deriving training points ---------------//

// apply startified sampling
var FCmerged = wetland.merge(vegetation).merge(urban); 

//Stratified Random Sampling: 

var FCimage = ee.Image().byte().paint(FCmerged, "LC").rename("LC")
// print(FCimage, 'image'); 

var stratifiedsample = FCimage.stratifiedSample({
  numPoints:10000, 
  classBand:"LC",
  region:aoi,
  scale:30, 
  classValues:[0,1,2], 
  classPoints:[1000,1000,1000],
  geometries:true
}) 
// print('Stratified samples', stratifiedsample); 
// print(stratifiedsample.reduceColumns(ee.Reducer.frequencyHistogram(),['LC']).get('histogram','No of points'));
// Map.addLayer(stratifiedsample, {}, 'Stratified Samples', false);

// ------------------ Extract pixel values ---------------------//

var stratifiedTraining14 = landsat8_2014.sampleRegions({
  tileScale: 3,
  collection: stratifiedsample,
  properties:['LC'],
  geometries: true,
  scale:30,
});

var stratifiedTraining20 = landsat8_2020.sampleRegions({
  tileScale: 3,
  collection: stratifiedsample,
  properties:['LC'],
  geometries: true,
  scale:30,
});
// --------------- Train Random Forest Classifier ----------------//

// select bands for classification
var bands = ['B2', 'B3', 'B4', 'B5', 'NDWI', 'NDVI', 'EVI']

// RF classifier
var RFclassifier14 = ee.Classifier.smileRandomForest(100).train({
  features: stratifiedTraining14,
  classProperty: 'LC',
  inputProperties: bands,
});

var RFclassifier20 = ee.Classifier.smileRandomForest(100).train({
  features: stratifiedTraining20,
  classProperty: 'LC',
  inputProperties: bands,
});
// --------------------- Classify the images -----------------------//
// landsat 8 2014 image
var classifiedImage2014 = landsat8_2014.classify(RFclassifier14);

// landsat 8 2020 image
var classifiedImage2020 = landsat8_2020.classify(RFclassifier20);

Map.addLayer(classifiedImage2014, {min: 0, max: 2, palette: ['blue', 'green', 'yellow']}, 'Landsat 8 2014 Classified');
Map.addLayer(classifiedImage2020, {min: 0, max: 2, palette: ['blue', 'green', 'yellow']}, 'Landsat 8 2020 Classified');

// ------------------- CHANGE DETECTION ----------------------------//

// Reclassify from 0-3 to 1-4
var landsat8_2014Classes = classifiedImage2014.remap([0, 1, 2], [1, 2, 3]);
var landsat8_2020Classes = classifiedImage2020.remap([0, 1, 2], [1, 2, 3]);

// Show all changed areas
var changed = landsat8_2020Classes.subtract(landsat8_2014Classes).neq(0);
Map.addLayer(changed, {min:0, max:1, palette: ['white', 'red']}, 'Change');

// We multiply the before image with 100 and add the after image
// The resulting pixel values will be unique and will represent each unique transition
// i.e. 102 is urban to bare, 103 urban to water etc.
var merged = landsat8_2014Classes.multiply(100).add(landsat8_2020Classes).rename('transitions');

// Use a frequencyHistogram to get a pixel count per class
var transitionMatrix = merged.reduceRegion({
  reducer: ee.Reducer.frequencyHistogram(), 
  geometry: aoi,
  maxPixels: 1e10,
  scale:30,
  tileScale: 16
});
// This prints number of pixels for each class transition
// print(transitionMatrix.get('transitions'));

// If we want to calculate the area of each class transition
// we can use a grouped reducer

// Divide by 1e6 to get the area in sq.km.
var areaImage = ee.Image.pixelArea().divide(1e4).addBands(merged);
// Calculate Area by each Transition Class
// using a Grouped Reducer
var areas = areaImage.reduceRegion({
      reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'transitions',
    }),
    geometry: aoi,
    scale: 100,
    tileScale: 4,
    maxPixels: 1e10
    }); 
// print('Areas', areas)
// Post-process the result to generate a clean output
var classAreas = ee.List(areas.get('groups'));
var classAreaLists = classAreas.map(function(item) {
      var areaDict = ee.Dictionary(item);
      var classNumber = ee.Number(areaDict.get('transitions')).format();
      var area = ee.Number(areaDict.get('sum')).round();
      return ee.List([classNumber, area]);
    });
var classTransitionsAreaDict = ee.Dictionary(classAreaLists.flatten());
// print(classTransitionsAreaDict);

// export to drive
Export.image.toDrive({
  image:classifiedImage2020.clip(aoi),
  description:'classified2020',
  scale:30,
  folder:'wetland',
  maxPixels:1e13,
  region:aoi
});

// resources
// https://courses.spatialthoughts.com/end-to-end-gee.html#module-4-change-detection