# Step 1: Use Node.js official image as the base
FROM node:20


# Step 2: Set the working directory to /app
WORKDIR /app

# Step 3: Copy package files to install dependencies
COPY package*.json ./

# Step 4: Install all dependencies, including devDependencies
RUN npm install

# Step 5: Copy the rest of the application code
COPY . .

## Generate Prisma Client
RUN npx prisma generate

# ## Push Prisma schema to database
# RUN npx prisma db push

# Step 7: Expose the application port
EXPOSE 9000

# Step 8: Define the startup command
CMD ["npm", "run", "dev"]
