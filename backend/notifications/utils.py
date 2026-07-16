from .models import Notification

from posts.models import Post

def create_notification(request, type_of_notification, post_id=None):
    if type_of_notification == Notification.POST_LIKE:
        body = f'{request.user.name} liked one of your posts!'
    elif type_of_notification == Notification.POST_COMMENT:
        body = f'{request.user.name} commented on one of your posts!'
    else:
        raise ValueError(f'Unknown notification type: {type_of_notification}')

    post = Post.objects.get(pk=post_id)

    notification = Notification.objects.create(
        body=body,
        type_of_notification=type_of_notification,
        created_by=request.user,
        post_id=post_id,
        created_for=post.created_by,
    )

    return notification
