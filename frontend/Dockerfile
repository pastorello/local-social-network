FROM node:22-alpine

WORKDIR /app

# The prepare script downloads the Cypress binary, which is neither needed
# nor supported inside this alpine dev image.
ENV CYPRESS_INSTALL_BINARY=0

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
