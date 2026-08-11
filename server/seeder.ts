
// ============================================
// seeder.ts
// ============================================
import { EVENTS } from "./services/eventService";
import fs from 'fs';
const DEVICE_TR069_DATA_MODEL_TYPE = process.env.DEVICE_TR069_DATA_MODEL_TYPE || "InternetGatewayDevice";
/**
 * Seeder class responsible for populating the database with initial data,
 * device‑specific values, WAN parameters, and notification settings.
 */
export class DataSeeder {
    private storage: any;        // Your storage interface
    private eventService: any;   // Event emitter service
    private defaultAcsUrl: string;
    private logger: any;

    constructor(storage: any, eventService: any, defaultAcsUrl: string, logger?: any) {
        this.storage = storage;
        this.eventService = eventService;
        this.defaultAcsUrl = defaultAcsUrl;
        this.logger = logger || console; // fallback to console if no logger provided
    }

    // -----------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------

    /**
     * Returns a dummy value for a given CWMP data type.
     * Used when a parameter has no value in the JSON model.
     */
    private generateDummyValue(type: string): string {
        switch (type.toLowerCase()) {
            case 'string':
                return 'dummy';
            case 'int':
            case 'unsignedint':
                return '0';
            case 'boolean':
                return '1'; // true
            case 'datetime':
                return new Date().toISOString();
            case 'object':
                return ''; // objects should be skipped anyway
            default:
                return '';
        }
    }

    /**
     * Loads and parses the device data model JSON file.
     */
    private async loadDataModel(): Promise<any[]> {
        const path = './shared/models/device_data_model.json';
        const content = await fs.promises.readFile(path, 'utf8');
        return JSON.parse(content);
    }

    /**
     * Loads and parses the device data model JSON file.
     */
    private async loadOverrideDataModel(): Promise<any[]> {
        const path = './shared/models/device_data_model_override.json';
        if (fs.existsSync(path)) {
            const content = await fs.promises.readFile(path, 'utf8');
            return JSON.parse(content);
        } else {
            return [];
        }

    }

    // -----------------------------------------------------------------
    // Public seeding methods
    // -----------------------------------------------------------------

    /**
     * Main seeding: loads the data model, creates missing parameters,
     * ensures required settings exist, and inserts a default user.
     */
    async seedInitialData(): Promise<void> {
        this.logger.info('Seeding initial data...');

        try {
            const dataModel = await this.loadDataModel();
            const existingParams = await this.storage.getParameters();
            this.logger.info(`Existing parameters count: ${existingParams.length}`);

            // 1. First‑time seeding (no parameters at all)
            if (existingParams.length === 0) {
                this.logger.info('First‑time seeding – inserting parameters from data model');
                await this.insertParametersFromModel(dataModel);
                await this.ensureSettingsExist();
                this.logger.info('Default parameters and settings inserted.');

            }

            // 2. Ensure settings exist even if not first‑time
            await this.ensureSettingsExist();

            // 3. Insert any new parameters that may have been added to the data model
            this.logger.info('Checking for new parameters in data model...');
            await this.insertMissingParameters(dataModel);

            // 4. Seed default user for Replit Auth
            await this.seedDefaultUser();

            //5. now check if there is any override configured
            this.logger.info('Checking Override data...');
            const retJsonDataArr = await this.loadOverrideDataModel();
            if (retJsonDataArr.length > 0) {
                this.logger.info('Override found overrining values!!');
                await this.overrideDefaultParameters(retJsonDataArr);
                this.logger.info('Override completed successfully!!');
            } else {
                this.logger.info('No override Configured!!');
            }

            this.logger.info('Seeding initial data completed successfully.');
        } catch (error) {
            this.logger.error('Seeding initial data failed:', error);
            process.exit(-1);
        }
    }

    /**
     * Seeds device‑specific data after a device connects.
     * Detects new devices and triggers a bootstrap inform if needed.
     */
    async seedDeviceData(mockDevice: any): Promise<void> {
        this.logger.info('Seeding device data...');

        try {
            const existingSerial = await this.storage.getParameter(DEVICE_TR069_DATA_MODEL_TYPE + '.DeviceInfo.SerialNumber');
            const isNewDevice = existingSerial?.value !== mockDevice.serialNumber;

            if (isNewDevice) {
                this.logger.info('New device detected – applying bootstrap settings');
                await Promise.all([
                    this.storage.updateSetting('acsUrl', this.defaultAcsUrl),
                    this.storage.updateSetting('username', (process.env.DEFAULT_ACS_USERNAME) ? process.env.DEFAULT_ACS_USERNAME : 'cpedefaultusr'),
                    this.storage.updateSetting('password', (process.env.DEFAULT_ACS_PASSWORD) ? process.env.DEFAULT_ACS_PASSWORD : 'cpedefaultpwd'),
                    this.storage.updateParameter(DEVICE_TR069_DATA_MODEL_TYPE + '.ManagementServer.URL', this.defaultAcsUrl),
                ]);
            }

            const deviceDefaults = [
                { name: DEVICE_TR069_DATA_MODEL_TYPE + '.DeviceInfo.Manufacturer', value: mockDevice.manufacturer },
                { name: DEVICE_TR069_DATA_MODEL_TYPE + '.DeviceInfo.ModelName', value: mockDevice.modelName },
                { name: DEVICE_TR069_DATA_MODEL_TYPE + '.DeviceInfo.SerialNumber', value: mockDevice.serialNumber },
                { name: DEVICE_TR069_DATA_MODEL_TYPE + '.DeviceInfo.ManufacturerOUI', value: mockDevice.oui },
                { name: DEVICE_TR069_DATA_MODEL_TYPE + '.DeviceInfo.ProductClass', value: mockDevice.productClass },
                { name: DEVICE_TR069_DATA_MODEL_TYPE + '.DeviceInfo.SoftwareVersion', value: mockDevice.softwareVersion },
            ];

            await Promise.all(deviceDefaults.map(d => this.storage.updateParameter(d.name, d.value)));

            if (isNewDevice) {
                this.eventService.emit(EVENTS.INFORM, 'SEED DATA EVENT', '0 BOOTSTRAP');
            }

            this.logger.info('Device data seeding completed.');
        } catch (error) {
            this.logger.error('Device data seeding failed:', error);
            process.exit(-1);
        }
    }

    /**
     * Seeds WAN / management server parameters.
     * Creates missing ones, updates existing ones (with notification flag = 1).
     */
    async seedWANData(): Promise<void> {
        this.logger.info('Seeding WAN data...');

        const wanParams = [
            { name: DEVICE_TR069_DATA_MODEL_TYPE + '.ManagementServer.PeriodicInformEnable', value: '1', type: 'boolean', writable: true },
            { name: DEVICE_TR069_DATA_MODEL_TYPE + '.ManagementServer.PeriodicInformInterval', value: '60', type: 'unsignedInt', writable: true },
            { name: DEVICE_TR069_DATA_MODEL_TYPE + '.ManagementServer.ParameterKey', value: '', type: 'unsignedInt', writable: true },
            { name: DEVICE_TR069_DATA_MODEL_TYPE + '.ManagementServer.AliasBasedAddressing', value: '0', type: 'boolean', writable: false },
            { name: DEVICE_TR069_DATA_MODEL_TYPE + '.IP.Interface.1.IPv4Address.1.IPAddress', value: '192.168.1.100', type: 'string', writable: false },
        ];

        try {
            await Promise.all(wanParams.map(async (param) => {
                const existing = await this.storage.getParameter(param.name);
                if (!existing) {
                    this.logger.info(`Creating WAN parameter: ${param.name}`);
                    await this.storage.createParameter(param);
                } else {
                    // Update with notification flag = 1 (third argument)
                    await this.storage.updateParameter(param.name, param.value, 1);
                }
            }));

            this.logger.info('WAN data seeding completed.');
        } catch (error) {
            this.logger.error('WAN data seeding failed:', error);
            process.exit(-1);
        }
    }

    /**
     * Enables notifications for specific parameters.
     */
    async seedNotificationData(): Promise<void> {
        this.logger.info('Seeding notification data...');

        try {
            const ipParam = await this.storage.getParameter(DEVICE_TR069_DATA_MODEL_TYPE + '.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress');
            if (!ipParam) {
                throw new Error('Required parameter not found: ' + DEVICE_TR069_DATA_MODEL_TYPE + '.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress');
            }

            // Enable notifications (third argument = 1)
            await this.storage.updateParameter(ipParam.name, ipParam.value, 1);
            // Add more parameters here if needed

            this.logger.info('Notification data seeding completed.');
        } catch (error) {
            this.logger.error('Notification seeding error:', error);
            // Non‑critical – do not exit process
        }
    }

    // -----------------------------------------------------------------
    // Internal helpers (private)
    // -----------------------------------------------------------------

    /**
     * Inserts all parameters from the data model, skipping container objects
     * and filling empty values with dummy data.
     */
    private async insertParametersFromModel(dataModel: any[]): Promise<void> {
        const createPromises = dataModel
            .filter(param => param.value !== 'Object') // skip container objects
            .map(async (param) => {
                let value = param.value;
                if (!value) {
                    value = this.generateDummyValue(param.type);
                }
                try {
                    await this.storage.createParameter({
                        name: param.name,
                        value,
                        type: param.type,
                        writable: param.writable,
                    });
                } catch (error: any) {
                    this.logger.warn(`Parameter ${param.name} could not be created: ${error.message}`);
                }
            });

        await Promise.all(createPromises);
    }

    /**
     * Ensures that essential settings (acsUrl, username, password) exist.
     */
    private async ensureSettingsExist(): Promise<void> {
        const settingsList = await this.storage.getSettings();
        const acsUrlSetting = settingsList.find((s: any) => s.key === 'acsUrl');
        this.logger.warn("Seeding ensureSettingsExist acsUrlSetting-->" + acsUrlSetting);
        if (!acsUrlSetting) {
            this.logger.warn('acsUrl setting missing – inserting defaults');
            await Promise.all([
                this.storage.insertOrUpdateSetting('acsUrl', this.defaultAcsUrl),
                this.storage.insertOrUpdateSetting('username', (process.env.DEFAULT_ACS_USERNAME) ? process.env.DEFAULT_ACS_USERNAME : 'cpedefaultusr'),
                this.storage.insertOrUpdateSetting('password', (process.env.DEFAULT_ACS_PASSWORD) ? process.env.DEFAULT_ACS_PASSWORD : 'cpedefaultpwd'),
                this.storage.insertOrUpdateSetting('interval', (process.env.DEFAULT_INTERVAL) ? process.env.DEFAULT_INTERVAL : '60'),
                this.storage.insertOrUpdateSetting('periodicInformEnabled', 'true'),
            ]);
        }
    }

    /**
     * Inserts any parameters from the data model that are missing in the database,
     * again skipping container objects and using dummy values when needed.
     */
    private async insertMissingParameters(dataModel: any[]): Promise<void> {
        const insertPromises = dataModel
            .filter(param => param.value !== 'Object') // skip container objects
            .map(async (param) => {
                const existing = await this.storage.getParameter(param.name);
                if (!existing) {
                    this.logger.info(`insertMissingParameters New parameter found: ${param.name}`);
                    let value = param.value;
                    if (!value) {
                        value = this.generateDummyValue(param.type);
                    }

                    await this.storage.createParameter({
                        name: param.name,
                        value,
                        type: param.type,
                        writable: param.writable,
                    });
                }
            });

        await Promise.all(insertPromises);
    }

    /**
     * Inserts any parameters from the data model that are missing in the database,
     * again skipping container objects and using dummy values when needed.
     */
    private async overrideDefaultParameters(dataModel: any[]): Promise<void> {
        const insertPromises = dataModel
            .filter(param => param.value !== 'Object') // skip container objects
            .map(async (param) => {
                const existing = await this.storage.getParameter(param.name);
                if (!existing) {
                    this.logger.info(`overrideDefaultParameters New parameter found: ${param.name}`);
                    let value = param.value;
                    if (!value) {
                        value = this.generateDummyValue(param.type);
                    }

                    await this.storage.createParameter({
                        name: param.name,
                        value,
                        type: param.type,
                        writable: param.writable,
                    });
                } else {
                    await this.storage.updateParameter(param.name, param.value);
                }
            });

        await Promise.all(insertPromises);
    }

    /**
     * Inserts a default user if none exists.
     */
    private async seedDefaultUser(): Promise<void> {
        const existingUser = await this.storage.getUser('1');
        if (!existingUser) {
            this.logger.info('Inserting default user...');
            await this.storage.upsertUser({
                email: 'brijesh.shukla@motive.com',
                firstName: 'Brijesh',
                lastName: 'Shukla',
                profileImageUrl: '',
            });
        }
    }
}