#stick instructions on how to build a docker file
FROM node:16.13.1

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
#docker will cache the results these are 2 cache key,
# if anything change it will yarn install
COPY package.json ./
COPY yarn.lock ./

RUN yarn

# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .
COPY .env.production .env

RUN yarn build 
#make dist file wont watch but just build 1 time.
#package.json need to have: "build": "tsc" command

ENV NODE_ENV production

EXPOSE 8080
CMD [ "node", "dist/index.js" ]
USER node