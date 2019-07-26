# coins-server
Node.js RESTful API server to accompany the coins-client project. Handles the client requests and interfaces with the mysql database. 

The server handles the logic for storing, transferring, and checking coins, coin transfers, and user acions.

### Install Instructions
* `git clone https://github.com/aveliz1999/coins-server`
* `cd coins-server`
* `npm install`
* Rename or copy config/production.json.example to config/production.json and fill in the correct information for your environment
* `npm start`

    The website will be available at http://127.0.0.1:3000 or with a port specified in the config file
