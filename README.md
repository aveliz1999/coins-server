# coins-server

Node.js REST API server to accompany the coins-client project.
Handles the client requests and interfaces with the mysql database.

## Finals Goals

The final goals for the project are to allow any user to make their own coin which they can manage. 
This would include the creation/distribution of the coin, and the items that can be bought with it. 
Optionally, they could set exchange rates for their coin (one way, from other coins to their own), as well as transfer fees and such.

Users should be able to trade the coins they own with other users.
They could send them directly, or request some from someone else.

Items bought with the coins would be stored for the user to use later.
Multiple options could be available for using the item which would be set up by the coin administrator.
The default would be a QR code that encodes the item's unique ID, but other methods could include web endpoints that could get called with this certain data.

## Progress

### Done

- [x] General database schema is set up and populated with defaults on project launch
- [x] User registration and login
- [x] User search by name
- [x] Get list of coins and amount a user has
- [x] Send coins directly to another user
- [x] Request coins from another user
- [x] Acept/decline requests from other users
- [x] Get a list of transactions that involve the user
- [x] Get a list of requests to the user

### To Do

- [ ] Registration validation (email, sms, ect.)
- [ ] (Optional) Alternative registration methods (google login, facebook login, etc.)
- [ ] Send a request for a coin the user doesn't and hasn't owned
- [ ] Allow the users to create new coins
- [ ] Allow the users to edit their coin's information
- [ ] Allow the users to add and edit items in their coin
- [ ] Create distrubition methods for coins
