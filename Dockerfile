# Step 1: Use Node.js official image as the base
FROM node:18

# Step 2: Set the working directory
WORKDIR /

# Step 3: Copy package files to install dependencies
COPY package*.json ./

# Step 4: Install dependencies without optional packages
RUN npm install

# Step 5: Copy the rest of the application code
COPY . .

# Step 7: Expose the application port
EXPOSE 8001

# Step 8: Define the startup command
CMD ["npm", "start"]
