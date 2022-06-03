FROM npm
WORKDIR /project
RUN npm install -g yo generator-code yarn
# ToDo make this an entrypoint script so it runs everytime instead of only on startup
RUN /bin/copy-host-user.sh "me"
USER "me"
