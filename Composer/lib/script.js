/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



/**
 * Acceration reading transaction
 * 
 * @param {com.reliance.network.AccelerationReading} tx 
 * @transaction
 */
async function AccelerationReading(tx) {
    const contractRegistry = await getContractRegistry();
    const shipmentRegistry = await getShippmentRegistry();
    let shippment = tx.shipment;
    let contract = await contractRegistry.get(shippment.contract.getIdentifier());
   
    
    if (contract.maximumAcceleration < tx.accelerationX + tx.accelerationY + tx.accelerationZ) {
        let accelerationThresholdEvent = getAccelerationThreshold();
        accelerationThresholdEvent.accelerationX = tx.accelerationX;
        accelerationThresholdEvent.accelerationY = tx.accelerationY;
        accelerationThresholdEvent.accelerationZ = tx.accelerationZ;
        accelerationThresholdEvent.latitude = tx.latitude;
        accelerationThresholdEvent.longitude = tx.longitude;
        if (tx.readingTime) {
            accelerationThresholdEvent.readingTime = tx.readingTime;
        } else {
            accelerationThresholdEvent.readingTime = "No Input"
        }
        accelerationThresholdEvent.message = "Acceleration reading reached threshold";
        accelerationThresholdEvent.shipment = shippment;
        emit(accelerationThresholdEvent);
    }
    shippment.accelerationReading.push(tx);
    await shipmentRegistry.update(shippment);
}

/**
 * 
 * Temperature Reading transaction
 * 
 * @param {com.reliance.network.TemperatureReading} tx
 * @transaction 
 */
async function TemperatureReading(tx) {

    const contractRegistry = await getContractRegistry();
    const shipmentRegistry = await getShippmentRegistry();
    let shippment = tx.shipment;
    let contract = await contractRegistry.get(shippment.contract.getIdentifier());

    let celcius = tx.celcius;
    let latitude = tx.latitude;
    let longitude = tx.longitude;
    let readingTime = tx.readingTime;

    
    
    if (celcius < contract.minimumTemperature || celcius > contract.maximumTemperature) {
        let event = getTemperatureThreshold();
        event.temperature = celcius;
        event.latitude = latitude;
        event.longitude = longitude;
        event.readingTime = readingTime;
        event.message = "Temperature reading reached threshold"
        event.shipment = shippment;
        emit(event);
        
    }

    shippment.temperatureReading.push(tx);
    await shipmentRegistry.update(shippment);
}

/**
 * Performs GPS reading
 * 
 * @param {com.reliance.network.GPSReading} tx
 * @transaction 
 */
async function GPSReading(tx) {
    let latitude = tx.latitude;
    let longitude = tx.longitude;
    let latitudeDirection = tx.latitudeDirection;
    let longitudeDirection = tx.longitudeDirection;

    const contractRegistry = await getContractRegistry();
    const shipmentRegistry = await getShippmentRegistry();
    const importerRegistry = await getImporterRegistry();

    let shippment = tx.shipment;
    let contract = await contractRegistry.get(shippment.contract.getIdentifier());
    let importer = await importerRegistry.get(contract.importer.getIdentifier());

    let computedAddress = latitude+longitude+latitudeDirection+longitudeDirection;
    /**
     * If importer address is equal to GPS Reading
     * then invoke 'Shipment in a port' event
     * Logic to compare is specified here: https://learn.upgrad.com/v/course/360/question/156354
     */
    
    if (importer.address === computedAddress)  {
        let event = getShipmentInPort();
        event.message = `Your shipment is in port ${importer.address}`;
        event.shipment = shippment;
        emit(event);
    }

    shippment.gpsReading.push(tx);
    await shipmentRegistry.update(shippment);

}

/**
 * 
 * Shipment Recevied transaction
 * 
 * @param {com.reliance.network.ShipmentReceived} tx
 * @transaction 
 */
async function ShipmentReceived(tx) {
    const contractRegistry = await getContractRegistry();
    const shipmentRegistry = await getShippmentRegistry();
    const importerRegistry = await getImporterRegistry();
    const exporterRegistry = await getExporterRegistry();
    const shipperRegistry = await getShipperRegistry();

    let shippment = tx.shipment;
    let contract = await contractRegistry.get(shippment.contract.getIdentifier());

    // Calculate totalPayout = unitPrice * unitPrice
    let totalPayout = shippment.unitCount * contract.unitPrice;
    shippment.shipmentStatus = 'Arrived';

  
    await shipmentRegistry.update(shippment);

   
    let currentDate = new Date();
    let contractArrivalDateTime = new Date(contract.arrivalDateTime);
   
    if (currentDate > contractArrivalDateTime) {
        
        totalPayout = 0;
    }
 

}

/**
 * Get contract registry
 * @returns {AssetRegistry} contractRegistry
 */
async function getContractRegistry() {
    const contractRegistry = await getAssetRegistry('com.reliance.network.Contract');
    return contractRegistry;
}

/**
 * Get shipment registry
 * @returns {AssetRegistry} shipmentRegistry
 */
async function getShippmentRegistry()  {
    const shipmentRegistry = await getAssetRegistry('com.reliance.network.Shipment');
    return shipmentRegistry;
}

/**
 * Get shipper registry
 * @returns {ParticipantRegistry} shipperRegistry
 */
async function getShipperRegistry() {
    const shipperRegistry = await getParticipantRegistry('com.reliance.network.Shipper');
    return shipperRegistry;
}

/**
 * Get exporter registry
 * @returns {ParticipantRegistry} exporterRegistry
 */
async function getExporterRegistry() {
    const ParticipantRegistry = await getParticipantRegistry('com.reliance.network.Exporter');
    return ParticipantRegistry;
}

/**
 * Get importer registry
 * @returns {ParticipantRegistry} importerRegistry
 */
async function getImporterRegistry() {
    const importerRegistry = await getParticipantRegistry('com.reliance.network.Importer');
    return importerRegistry;
}

/**
 * getAccelerationThreshold event
 * @returns {Event} AccelerationThreshold
 */
function getAccelerationThreshold() {
    let event = getFactory().newEvent('com.reliance.network', 'AccelerationThreshold');
    return event;
}

/**
 * getTemperatureThreshold event
 * @returns {Event} TemperatureThreshold
 */
function getTemperatureThreshold() {
    let event = getFactory().newEvent('com.reliance.network', 'TemperatureThreshold');
    return event;
}

/**
 * getShipmentInPort event
 * @returns {Event} ShipmentInPort
 */
function getShipmentInPort() {
    let event = getFactory().newEvent('com.reliance.network', 'ShipmentInPort');
    return event;
}


