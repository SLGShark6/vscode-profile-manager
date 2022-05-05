FROM npm
WORKDIR /project
RUN npm install -g yo generator-code yarn
RUN /bin/copy-host-user.sh "me"
USER "me"
