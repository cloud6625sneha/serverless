const functions = require('@google-cloud/functions-framework');
const nodemailer = require('nodemailer');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();
const { DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_DIALECT } = process.env;
const { v4: uuidv4 } = require('uuid');

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    dialect: DB_DIALECT,
});

functions.cloudEvent('helloPubSub', async (cloudEvent) => {
    try {
        console.debug("started executing function");
        const base64name = cloudEvent.data.message.data;
        const name = Buffer.from(base64name, 'base64').toString();
        const nameJson = JSON.parse(name);
        const email = nameJson.username;
        const fName = nameJson.first_name + nameJson.last_name;
        const id = nameJson.id;

        const smtpConfig = nodemailer.createTransport({
            host: 'smtp.mailgun.org',
            port: 587,
            secure: false,
            auth: {
                user: 'postmaster@snehayenduri.me',
                pass: '1c89d91f3c12d9d7dba97e983e9413b2-309b0ef4-9f1b4e5b'
            },
        });

        const verificationToken = uuidv4();

        const mailContent = {
            from: 'webapp@snehayenduri.me',
            to: email,
            subject: 'Verify your email',
            text: `Hello ${fName}, click the following link to verify your email: https://snehayenduri.me/v1/user/self/verify/${verificationToken}`,
            html: `<p>Hello ${fName}, click the following link to verify your email: <a href="https://snehayenduri.me/v1/user/self/verify/${verificationToken}">Verify Email</a></p>`,
        };

        const User = sequelize.define("user", {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                allowNull: false,
                primaryKey: true
            },
            username: {
                type: DataTypes.STRING,
                unique: true,
                allowNull: false
            },
            password: {
                type: DataTypes.STRING,
                allowNull: false
            },
            first_name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            last_name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            account_created: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
            account_updated: {
                type: DataTypes.DATE,
                allowNull: true,
                defaultValue: DataTypes.NOW
            },
            expiration_time: {
                type: DataTypes.DATE,
                allowNull: true
            },
            is_verified: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            verificationToken: {
                type: DataTypes.UUID,
                allowNull: true
            }
        });


        await smtpConfig.sendMail(mailContent);
        
        console.debug("setting expiration Time");
        const expirationTime = new Date(Date.now() + 2 * 60 * 1000);
        console.debug("completed setting expiration Time");
        const allowedFields = {};
        allowedFields.expiration_time = expirationTime;
        allowedFields.verificationToken = verificationToken;

        await User.update(allowedFields, { where: { id: id } });

        console.debug('User updated successfully');
        return Promise.resolve();
    } catch (error) {
        console.error("An error occurred:", error);
        return Promise.reject(error);
    }
});
