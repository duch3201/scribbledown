#!/bin/sh
set -e

# i need to have this stupid sh script
# so the directories in the container (images/ files/ etc...) will be populated, bc for some f***ing reason
# docker assumes you want full control over the directory you -v. meaning if the host directory is empty the one in container will also be empty

for dir in template files images plugins; do
  if [ ! "$(ls -A /app/$dir)" ]; then
    echo "Initializing /app/$dir with default contents..."
    
    # make sure target exists
    mkdir -p /app/$dir
    
    # copy contents if there are any, or just make sure directory is created
    if [ -d /app/defaults/$dir ] && [ "$(ls -A /app/defaults/$dir)" ]; then
      cp -r /app/defaults/$dir/* /app/$dir/
    else
      echo "No default contents for /app/$dir, creating empty directory."
    fi
  fi
done

# if [ ! -f /app/blog.conf ]; then
#   echo "Initializing /app/blog.conf with default configuration..."
#   cp /app/defaults/blog.conf /app/blog.conf
# fi

exec "$@"
